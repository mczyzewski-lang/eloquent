/**
 * Prezenty od dziadków:
 * 1) bezpłatna bajka-niespodzianka (~2 min) z bezpiecznym linkiem /prezent/[token],
 * 2) zakup miesiąca dostępu (jednorazowo, bez odnowienia) + aktywacja przez rodzica /aktywuj-prezent/[token].
 */
import { createHmac } from "node:crypto";
import { z } from "zod";
import { absoluteUrl, getSessionSecret } from "@/lib/config";
import { getDb, nowIso, type GiftPurchaseRow } from "@/lib/db";
import { getNameForms, addressForm, validateName } from "@/lib/domain/names";
import { addDays, FREE_GIFT_TTL_DAYS, GIFT_ACTIVATION_TTL_DAYS, generateSecureToken, hashToken, isExpired, isTokenShapeValid } from "@/lib/domain/tokens";
import { RELATION_TYPES, type RelationType } from "@/lib/domain/templates";
import { GIFT_STORY } from "@/content/sample";
import { buildRenderPlan } from "@/lib/domain/story";
import { currentVoiceProfile } from "@/lib/audio/tts";
import { assemblePlan, signedAudioUrl } from "./audio-pipeline";
import { createOrUpdateFamily, getFamilyByOwner } from "./families";
import { getAccess } from "./access";
import { track } from "./analytics";
import { sendEmail } from "./email";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

const name = z.string().trim().min(1).max(30).refine((v) => validateName(v).ok, "Nieprawidłowe imię");

export const freeGiftSchema = z.object({
  childName: name,
  childAge: z.number().int().min(3).max(8),
  giverRelation: z.enum(["grandma", "grandpa"]),
  giverName: name,
  interests: z.array(z.string().max(30)).max(12).default([]),
});

export const giftPurchaseSchema = z.object({
  childName: name,
  childAge: z.number().int().min(4).max(7),
  giverName: name,
  giverRelation: z.enum(["grandma", "grandpa", "other"]),
  members: z.array(z.object({ relation: z.enum(RELATION_TYPES as [RelationType, ...RelationType[]]), name })).max(12).default([]),
  interests: z.array(z.string().max(30)).max(12).default([]),
  buyerEmail: z.string().email().max(200),
  parentEmail: z.string().email().max(200).optional().nullable(),
});

export function giverTitle(relation: "grandma" | "grandpa" | "other", giverName: string) {
  const n = validateName(giverName).ok ? (validateName(giverName) as { name: string }).name : giverName;
  return relation === "grandma" ? `babcia ${n}` : relation === "grandpa" ? `dziadek ${n}` : n;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase("pl") + s.slice(1);

export async function createFreeGiftStory(input: z.infer<typeof freeGiftSchema>) {
  await ensureRuntimeSettings();
  const childName = (validateName(input.childName) as { name: string }).name;
  const forms = getNameForms(childName);
  const giver = giverTitle(input.giverRelation, input.giverName);
  const ctx = {
    child: { name: forms.nominative, address: addressForm(forms, "diminutive"), gender: forms.gender },
    family: { [input.giverRelation]: (validateName(input.giverName) as { name: string }).name },
    extra: { giver, giverfull: cap(giver) },
  };
  const plan = buildRenderPlan(GIFT_STORY, ctx, currentVoiceProfile());
  const res = await assemblePlan(plan, { familyId: null, purposeShared: "core", purposePersonal: "gift_story", language: "pl" });
  const token = generateSecureToken();
  await getDb().insert("gift_stories", {
    token_hash: hashToken(token),
    child_name: childName,
    child_age: input.childAge,
    giver_relation: input.giverRelation,
    giver_name: (validateName(input.giverName) as { name: string }).name,
    interests: input.interests,
    assembly_key: res.assembly.assembly_key,
    expires_at: addDays(new Date(), FREE_GIFT_TTL_DAYS).toISOString(),
    play_count: 0,
    created_at: nowIso(),
  });
  await track("gift_free_created", { props: { relation: input.giverRelation } });
  return { token, url: absoluteUrl(`/prezent/${token}`) };
}

export async function getFreeGiftStory(token: string) {
  if (!isTokenShapeValid(token)) return null;
  const db = getDb();
  const row = await db.findOne("gift_stories", { token_hash: hashToken(token) });
  if (!row || isExpired(row.expires_at)) return null;
  const assembly = row.assembly_key ? await db.findOne("audio_assemblies", { assembly_key: row.assembly_key }) : null;
  if (!assembly) return null;
  await db.update("gift_stories", { id: row.id }, { play_count: row.play_count + 1 });
  const provider = (await db.findOne("audio_cache", { cache_key: assembly.segment_keys[0] }))?.provider ?? "mock";
  return { gift: row, assembly, audioUrl: await signedAudioUrl(assembly.storage_path, 6 * 3600), provider, giver: giverTitle(row.giver_relation, row.giver_name) };
}

/** Token aktywacyjny wyprowadzany z identyfikatora zakupu (HMAC) — w bazie przechowujemy tylko hash. */
export function activationTokenFor(purchaseId: string): string {
  return createHmac("sha256", getSessionSecret()).update(`gift-activation:${purchaseId}`).digest("base64url").slice(0, 43);
}

export async function createGiftPurchase(input: z.infer<typeof giftPurchaseSchema>): Promise<GiftPurchaseRow> {
  const row = await getDb().insert("gift_purchases", {
    buyer_email: input.buyerEmail.toLowerCase(),
    giver_name: (validateName(input.giverName) as { name: string }).name,
    giver_relation: input.giverRelation,
    child_name: (validateName(input.childName) as { name: string }).name,
    child_age: input.childAge,
    family_members: input.members,
    interests: input.interests,
    parent_email: input.parentEmail?.toLowerCase() ?? null,
    stripe_session_id: null,
    status: "pending",
    token_hash: null,
    expires_at: null,
    redeemed_at: null,
    redeemed_family_id: null,
    created_at: nowIso(),
  });
  await track("gift_purchase_started", { props: { relation: input.giverRelation } });
  return row;
}

/** Idempotentne oznaczenie zakupu jako opłaconego (webhook Stripe / symulacja). */
export async function markGiftPaid(purchaseId: string, sessionId: string, amountGross: number) {
  const db = getDb();
  const purchase = await db.findOne("gift_purchases", { id: purchaseId });
  if (!purchase || purchase.status !== "pending") return purchase;
  const token = activationTokenFor(purchaseId);
  const [updated] = await db.update(
    "gift_purchases",
    { id: purchaseId, status: "pending" },
    { status: "paid", token_hash: hashToken(token), expires_at: addDays(new Date(), GIFT_ACTIVATION_TTL_DAYS).toISOString(), stripe_session_id: sessionId },
  );
  if (!updated) return purchase;
  await db.insert("payments", { family_id: null, stripe_invoice_id: null, stripe_session_id: sessionId, kind: "gift", amount_gross: amountGross, currency: "pln", status: "paid", created_at: nowIso() });
  await track("gift_purchased", { props: { relation: purchase.giver_relation } });
  const link = absoluteUrl(`/aktywuj-prezent/${token}`);
  const giver = giverTitle(purchase.giver_relation, purchase.giver_name);
  await sendEmail(purchase.buyer_email, "Prezent od Elofika jest gotowy", `Dziękujemy! Link aktywacyjny dla rodziców ${purchase.child_name}: ${link}\nLink jest ważny przez 12 miesięcy i można go użyć jeden raz.`);
  if (purchase.parent_email) {
    await sendEmail(purchase.parent_email, `${cap(giver)} podarował(a) prezent od Elofika`, `${cap(giver)} podarował(a) ${purchase.child_name} miesiąc codziennych bajek z Elofikiem. Aktywuj prezent: ${link}`);
  }
  return updated;
}

export async function getGiftPurchaseByToken(token: string) {
  if (!isTokenShapeValid(token)) return null;
  const row = await getDb().findOne("gift_purchases", { token_hash: hashToken(token) });
  if (!row || isExpired(row.expires_at)) return null;
  return row;
}

export class GiftRedeemError extends Error {
  constructor(public code: "invalid" | "already_redeemed" | "not_paid") {
    super(code);
  }
}

/**
 * Aktywacja prezentu przez rodzica — jednorazowa (warunkowy UPDATE status=paid → redeemed).
 * Dostęp: 1 miesiąc, bez automatycznego odnowienia. Jeśli rodzina ma już dostęp, prezent wydłuża go od końca okresu.
 */
export async function redeemGift(token: string, userId: string) {
  const db = getDb();
  const purchase = await getGiftPurchaseByToken(token);
  if (!purchase) throw new GiftRedeemError("invalid");
  if (purchase.status === "redeemed") throw new GiftRedeemError("already_redeemed");
  if (purchase.status !== "paid") throw new GiftRedeemError("not_paid");

  let family = await getFamilyByOwner(userId);
  if (!family) {
    const members = [...purchase.family_members];
    if (purchase.giver_relation !== "other" && !members.some((m) => m.relation === purchase.giver_relation && m.name === purchase.giver_name)) {
      members.unshift({ relation: purchase.giver_relation, name: purchase.giver_name });
    }
    family = await createOrUpdateFamily(userId, {
      child: { name: purchase.child_name, age: Math.min(7, Math.max(4, purchase.child_age)), addressStyle: "diminutive", diminutive: null, vocative: null, diminutiveVocative: null, gender: null },
      members,
      interests: purchase.interests,
      locale: "pl",
    });
  }
  const claimed = await db.update("gift_purchases", { id: purchase.id, status: "paid" }, { status: "redeemed", redeemed_at: nowIso(), redeemed_family_id: family.id });
  if (!claimed.length) throw new GiftRedeemError("already_redeemed");

  const access = await getAccess(family.id);
  const start = access.hasAccess && access.endsAt ? new Date(access.endsAt) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  await db.insert("gift_entitlements", { family_id: family.id, gift_purchase_id: purchase.id, starts_at: start.toISOString(), ends_at: end.toISOString(), created_at: nowIso() });
  await track("gift_redeemed", { familyId: family.id });
  return { family, endsAt: end.toISOString() };
}
