import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import { getDb, nowIso, type ChildProfileRow, type FamilyMemberRow, type FamilyRow } from "@/lib/db";
import { addressForm, getNameForms, validateName, type AddressStyle, type GrammaticalGender, type NameForms } from "@/lib/domain/names";
import { generateReferralCode } from "@/lib/domain/referral";
import { RELATION_TYPES, type RelationType, type TemplateContext } from "@/lib/domain/templates";
import { isValidTimezone } from "@/lib/domain/unlock";
import { ROUTINE_IDS, routineById } from "@/lib/domain/routine";
import { z } from "zod";

export const INTERESTS = [
  { id: "zwierzeta", label: "Zwierzęta", icon: "PawPrint" },
  { id: "kosmos", label: "Kosmos", icon: "Rocket" },
  { id: "dinozaury", label: "Dinozaury", icon: "Bone" },
  { id: "przyroda", label: "Przyroda", icon: "Leaf" },
  { id: "pojazdy", label: "Pojazdy", icon: "Car" },
  { id: "morza", label: "Morza i oceany", icon: "Waves" },
  { id: "magia", label: "Magia", icon: "Sparkles" },
  { id: "odkrywanie", label: "Odkrywanie świata", icon: "Compass" },
  { id: "roboty", label: "Roboty", icon: "Bot" },
  { id: "przygody", label: "Przygody", icon: "Map" },
  { id: "sport", label: "Sport", icon: "Trophy" },
  { id: "inne", label: "Inne", icon: "Heart" },
] as const;

export const RELATION_LABELS: Record<RelationType, string> = {
  mom: "Mama",
  dad: "Tata",
  grandma: "Babcia",
  grandpa: "Dziadek",
  brother: "Brat",
  sister: "Siostra",
  dog: "Pies",
  cat: "Kot",
  other: "Ktoś bliski",
};

const nameField = z.string().trim().min(1).max(30).refine((v) => validateName(v).ok, "Nieprawidłowe imię");
const optionalName = z.string().trim().max(30).optional().nullable().transform((v) => (v ? v : null)).refine((v) => !v || validateName(v).ok, "Nieprawidłowe imię");

export const onboardingSchema = z.object({
  child: z.object({
    name: nameField,
    age: z.number().int().min(4).max(7),
    diminutive: optionalName,
    vocative: optionalName,
    diminutiveVocative: optionalName,
    gender: z.enum(["m", "f", "n"]).nullable().optional(),
    addressStyle: z.enum(["diminutive", "full", "name_only"]).default("diminutive"),
  }),
  members: z.array(z.object({ relation: z.enum(RELATION_TYPES as [RelationType, ...RelationType[]]), name: nameField })).max(20).default([]),
  interests: z.array(z.string().max(30)).max(12).default([]),
  routine: z.enum(ROUTINE_IDS).nullable().optional(),
  timezone: z.string().optional(),
  locale: z.enum(["pl", "en", "es", "de", "fr"]).default("pl"),
  referralCode: z.string().max(20).optional().nullable(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export interface FamilyBundle {
  family: FamilyRow;
  /** Aktywne dziecko (dla niego bajki, powitania i imiona w historiach). */
  child: ChildProfileRow | null;
  /** Wszystkie dzieci w rodzinie (kolejność dodania). */
  children: ChildProfileRow[];
  members: FamilyMemberRow[];
  interests: string[];
  childForms: NameForms | null;
}

export async function getFamilyByOwner(userId: string): Promise<FamilyRow | null> {
  return getDb().findOne("families", { owner_user_id: userId });
}

export async function getFamilyBundle(familyId: string): Promise<FamilyBundle | null> {
  const db = getDb();
  const family = await db.findOne("families", { id: familyId });
  if (!family) return null;
  const children = await db.find("child_profiles", { family_id: familyId }, { orderBy: { column: "created_at" } });
  const child = children.find((c) => c.id === family.active_child_id) ?? children[0] ?? null;
  const members = await db.find("family_members", { family_id: familyId }, { orderBy: { column: "sort_order" } });
  const interests = child ? (await db.find("child_interests", { child_id: child.id })).map((i) => i.interest_id) : [];
  return { family, child, children, members, interests, childForms: child ? childNameForms(child) : null };
}

export const MAX_CHILDREN = 4;

const childOnlySchema = onboardingSchema.shape.child;

/** Dodaje kolejne dziecko do rodziny i ustawia je jako aktywne. */
export async function addChild(familyId: string, input: z.infer<typeof childOnlySchema>, interests: string[] = []): Promise<ChildProfileRow> {
  const db = getDb();
  const count = await db.count("child_profiles", { family_id: familyId });
  if (count >= MAX_CHILDREN) throw new Error(`W jednej rodzinie może być maksymalnie ${MAX_CHILDREN} dzieci.`);
  const v = validateName(input.name);
  const child = await db.insert("child_profiles", {
    family_id: familyId,
    name: v.ok ? v.name : input.name,
    age: input.age,
    diminutive: input.diminutive ?? null,
    vocative_override: input.vocative ?? null,
    diminutive_vocative_override: input.diminutiveVocative ?? null,
    gender: (input.gender ?? null) as GrammaticalGender | null,
    address_style: input.addressStyle as AddressStyle,
    created_at: nowIso(),
  });
  const allowed = new Set<string>(INTERESTS.map((x) => x.id));
  for (const interest of interests.filter((x) => allowed.has(x))) await db.insert("child_interests", { child_id: child.id, interest_id: interest });
  await db.update("families", { id: familyId }, { active_child_id: child.id });
  return child;
}

export async function switchChild(familyId: string, childId: string) {
  const db = getDb();
  const child = await db.findOne("child_profiles", { id: childId, family_id: familyId });
  if (!child) throw new Error("Nie znaleziono dziecka.");
  await db.update("families", { id: familyId }, { active_child_id: child.id });
  return child;
}

export async function removeChild(familyId: string, childId: string) {
  const db = getDb();
  const children = await db.find("child_profiles", { family_id: familyId }, { orderBy: { column: "created_at" } });
  if (children.length <= 1) throw new Error("W rodzinie musi zostać co najmniej jedno dziecko.");
  if (!children.some((c) => c.id === childId)) throw new Error("Nie znaleziono dziecka.");
  await db.delete("child_interests", { child_id: childId });
  await db.delete("child_profiles", { id: childId, family_id: familyId });
  const next = children.find((c) => c.id !== childId)!;
  await db.update("families", { id: familyId }, { active_child_id: next.id });
}

export function childNameForms(child: ChildProfileRow): NameForms {
  const forms = getNameForms(child.name, {
    vocative: child.vocative_override,
    diminutive: child.diminutive,
    diminutiveVocative: child.diminutive_vocative_override,
    gender: child.gender,
  });
  // jeśli rodzic podał własne zdrobnienie bez wołacza, nie zgadujemy — używamy wołacza pełnego imienia
  if (child.diminutive && !child.diminutive_vocative_override && forms.diminutive !== getNameForms(child.name).diminutive) {
    forms.diminutiveVocative = null;
  }
  return forms;
}

export function buildTemplateContext(bundle: FamilyBundle): TemplateContext | null {
  if (!bundle.child || !bundle.childForms) return null;
  const family: TemplateContext["family"] = {};
  for (const m of bundle.members) if (!family[m.relation]) family[m.relation] = m.name; // pierwszy z danej relacji
  return {
    child: { name: bundle.childForms.nominative, address: addressForm(bundle.childForms, bundle.child.address_style), gender: bundle.childForms.gender },
    family,
  };
}

export async function createOrUpdateFamily(userId: string, input: OnboardingInput): Promise<FamilyRow> {
  const db = getDb();
  const tz = input.timezone && isValidTimezone(input.timezone) ? input.timezone : config.defaultTimezone;
  let family = await getFamilyByOwner(userId);
  if (!family) {
    family = await db.insert("families", {
      owner_user_id: userId,
      timezone: tz,
      locale: input.locale,
      activated_at: nowIso(),
      referral_code: generateReferralCode(),
      referred_by_code: input.referralCode ?? null,
      voice_greeting_enabled: true,
      voice_consent_at: null,
      marketing_consent_at: null,
      stripe_customer_id: null,
      listening_routine: input.routine ?? null,
      created_at: nowIso(),
    });
    // przypomnienie o porze rutyny (domyślnie wyłączone — włącza rodzic)
    await db.insert("notification_preferences", { family_id: family.id, email_daily: false, push_enabled: false, send_hour: routineById(input.routine)?.hour ?? 17, updated_at: nowIso() });
  } else if (input.routine) {
    family = (await db.update("families", { id: family.id }, { listening_routine: input.routine }))[0];
  }
  await saveChildAndFamily(family.id, input);
  return family;
}

export async function saveChildAndFamily(familyId: string, input: Pick<OnboardingInput, "child" | "members" | "interests">) {
  const db = getDb();
  const family = await db.findOne("families", { id: familyId });
  const all = await db.find("child_profiles", { family_id: familyId }, { orderBy: { column: "created_at" } });
  const existingChild = all.find((c) => c.id === family?.active_child_id) ?? all[0];
  const childRow = {
    family_id: familyId,
    name: validateName(input.child.name).ok ? (validateName(input.child.name) as { name: string }).name : input.child.name,
    age: input.child.age,
    diminutive: input.child.diminutive ?? null,
    vocative_override: input.child.vocative ?? null,
    diminutive_vocative_override: input.child.diminutiveVocative ?? null,
    gender: (input.child.gender ?? null) as GrammaticalGender | null,
    address_style: input.child.addressStyle as AddressStyle,
  };
  const child = existingChild
    ? (await db.update("child_profiles", { id: existingChild.id }, childRow))[0]
    : await db.insert("child_profiles", { ...childRow, created_at: nowIso() });

  await db.delete("family_members", { family_id: familyId });
  let i = 0;
  for (const m of input.members) {
    const v = validateName(m.name);
    if (!v.ok) continue;
    await db.insert("family_members", { id: randomUUID(), family_id: familyId, relation: m.relation, name: v.name, sort_order: i++, created_at: nowIso() });
  }
  await db.delete("child_interests", { child_id: child.id });
  const allowed = new Set<string>(INTERESTS.map((x) => x.id));
  for (const interest of input.interests.filter((x) => allowed.has(x))) {
    await db.insert("child_interests", { child_id: child.id, interest_id: interest });
  }
  return child;
}

/** „mama Monika, tata Marek i pies Burek” — podsumowanie w mianowniku (bez odmiany). */
export function membersSummary(members: { relation: RelationType; name: string }[]): string {
  const parts = members.map((m) => `${RELATION_LABELS[m.relation].toLocaleLowerCase("pl")} ${m.name}`);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;
}

/** Eksport danych rodziny (RODO art. 20). */
export async function exportFamilyData(familyId: string) {
  const db = getDb();
  const bundle = await getFamilyBundle(familyId);
  return {
    exported_at: nowIso(),
    family: bundle?.family,
    child: bundle?.child,
    members: bundle?.members,
    interests: bundle?.interests,
    listening_progress: await db.find("listening_progress", { family_id: familyId }),
    subscriptions: await db.find("subscriptions", { family_id: familyId }),
    payments: await db.find("payments", { family_id: familyId }),
    voice_greeting_sessions: await db.find("voice_greeting_sessions", { family_id: familyId }),
    notification_preferences: await db.find("notification_preferences", { family_id: familyId }),
    note: "Nie przechowujemy nagrań głosu ani pełnych transkrypcji wypowiedzi dziecka.",
  };
}

/** Trwałe usunięcie danych rodziny (RODO art. 17). Dane płatności zachowujemy wyłącznie w zakresie wymaganym przez prawo podatkowe (zanonimizowane). */
export async function deleteFamilyData(familyId: string) {
  const db = getDb();
  const children = await db.find("child_profiles", { family_id: familyId });
  for (const c of children) await db.delete("child_interests", { child_id: c.id });
  for (const t of ["child_profiles", "family_members", "listening_progress", "story_unlocks", "voice_greeting_sessions", "family_assemblies", "notification_preferences", "referral_rewards", "gift_entitlements", "custom_stories"] as const) {
    await db.delete(t, { family_id: familyId } as never);
  }
  await db.update("payments", { family_id: familyId }, { family_id: null });
  await db.update("analytics_events", { family_id: familyId }, { family_id: null });
  await db.update("ai_cost_logs", { family_id: familyId }, { family_id: null });
  await db.delete("subscriptions", { family_id: familyId });
  await db.delete("families", { id: familyId });
}
