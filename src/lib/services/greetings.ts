/**
 * Powitania „Hej Elofik!”: wybór wariantu + audio z cache.
 * Generowane raz na (imię, wariant, głos) i przygotowywane z wyprzedzeniem (prefetch).
 */
import { getDb, nowIso } from "@/lib/db";
import { ttsCacheKey } from "@/lib/domain/hash";
import { applyPronunciation, PRONUNCIATION_VERSION } from "@/lib/domain/pronunciation";
import { createHash } from "node:crypto";
import { MASTERING_VERSION, type PlannedSegment, type RenderPlan } from "@/lib/domain/story";
import { GREETING_TEMPLATE_VERSION, mergeGreetingBank, splitGreetingTemplate, pickGreeting, pickGreetingKind, variantsFor, type GreetingVariant } from "@/lib/domain/greetings";
import { nameCacheKey } from "@/lib/domain/names";
import { renderTemplate, type TemplateContext } from "@/lib/domain/templates";
import type { Locale } from "@/lib/domain/command-matcher";
import { currentVoiceProfile, getTts } from "@/lib/audio/tts";
import { assemblePlan, ensureSegmentAudio, signedAudioUrl } from "./audio-pipeline";
import { lastListenedAt } from "./progress";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export function greetingCacheKey(text: string, locale: string) {
  const v = currentVoiceProfile();
  return ttsCacheKey({
    text,
    voiceId: v.voiceId,
    modelId: v.modelId,
    voiceSettings: v.settings,
    language: locale,
    templateVersion: GREETING_TEMPLATE_VERSION,
    pronunciationVersion: PRONUNCIATION_VERSION,
  });
}

export async function getGreetingBank(): Promise<GreetingVariant[]> {
  return mergeGreetingBank(await getDb().find("greetings"));
}

export interface PreparedGreeting {
  variantId: string;
  kind: GreetingVariant["kind"];
  text: string;
  audioUrl: string;
  provider: "elevenlabs" | "mock";
  assetLabel: string;
}

/** Przerwa między sklejanymi fragmentami powitania (koniec zdania). */
const GREETING_JOIN_PAUSE_MS = 220;

/**
 * Plan nagrania powitania: zdania z imieniem → krótkie nagranie dla dziecka,
 * pozostałe zdania → wspólne nagranie (raz dla wszystkich dzieci, klucz zależy tylko od tekstu i głosu).
 */
export function buildGreetingPlan(ctx: TemplateContext, variant: GreetingVariant): RenderPlan & { text: string } {
  const parts = splitGreetingTemplate(variant.template).map((p) => ({ ...p, text: applyPronunciation(renderTemplate(p.template, ctx)) }));
  const segments: PlannedSegment[] = parts.map((p, i) => ({
    segmentId: `${variant.id}#${i + 1}`,
    type: p.personal ? "PERSONALIZED_CHILD" : "CORE",
    text: p.text,
    cacheKey: greetingCacheKey(p.text, variant.locale),
    shared: !p.personal,
    pauseAfterMs: i < parts.length - 1 ? GREETING_JOIN_PAUSE_MS : 0,
    previousText: parts[i - 1]?.text,
    nextText: parts[i + 1]?.text,
  }));
  const assemblyKey = createHash("sha256").update(["GREETING", ...segments.map((x) => x.cacheKey), MASTERING_VERSION].join("|")).digest("hex");
  return { storyId: "greetings", version: 1, segments, assemblyKey, text: parts.map((p) => p.text).join(" ") };
}

/** Zapewnia audio wariantu: wspólne zdania z cache (raz dla wszystkich), nowe TTS tylko dla fragmentu z imieniem. */
export async function ensureGreetingAudio(ctx: TemplateContext, variant: GreetingVariant, familyId: string | null): Promise<PreparedGreeting> {
  await ensureRuntimeSettings();
  const db = getDb();
  const voice = currentVoiceProfile();
  const plan = buildGreetingPlan(ctx, variant);
  const nameKey = nameCacheKey(ctx.child.name);
  const where = { child_name_key: nameKey, variant_id: variant.id, voice_version: voice.voiceVersion, locale: variant.locale, address: ctx.child.address };
  let storagePath: string;
  let provider: "elevenlabs" | "mock";
  if (plan.segments.length === 1) {
    const seg = plan.segments[0];
    const row = await ensureSegmentAudio(seg.text, seg.cacheKey, { purpose: "greeting", familyId, segmentType: "GREETING", shared: seg.shared, language: variant.locale });
    storagePath = row.storage_path;
    provider = row.provider;
  } else {
    const { assembly } = await assemblePlan(plan, { familyId, purposeShared: "greeting", purposePersonal: "greeting", language: variant.locale });
    storagePath = assembly.storage_path;
    const personal = plan.segments.find((x) => !x.shared) ?? plan.segments[0];
    provider = (await db.findOne("audio_cache", { cache_key: personal.cacheKey }))?.provider ?? getTts().name;
  }
  const found = await db.findOne("greeting_audio_cache", where);
  const indexKey = plan.segments.length === 1 ? plan.segments[0].cacheKey : plan.assemblyKey;
  if (!found || found.cache_key !== indexKey || found.text !== plan.text) {
    if (found) await db.delete("greeting_audio_cache", { id: found.id });
    await db.upsert("greeting_audio_cache", { ...where, cache_key: indexKey, text: plan.text, created_at: nowIso() }, ["child_name_key", "variant_id", "voice_version", "locale", "address"]);
  }
  return {
    variantId: variant.id,
    kind: variant.kind,
    text: plan.text,
    audioUrl: await signedAudioUrl(storagePath),
    provider,
    assetLabel: `${nameKey.toUpperCase()} + ${variant.id} + ${voice.voiceVersion}`,
  };
}

export async function greetingHistory(familyId: string, storyDay: number, now = new Date()) {
  const totalGreetings = await getDb().count("voice_greeting_sessions", { family_id: familyId, outcome: { in: ["recognized", "skipped"] } });
  return { totalGreetings, lastListenedAt: await lastListenedAt(familyId), now, storyDay };
}

export async function prepareGreetingForStory(familyId: string, ctx: TemplateContext, locale: Locale, storyDay: number): Promise<PreparedGreeting> {
  const history = await greetingHistory(familyId, storyDay);
  return ensureGreetingAudio(ctx, pickGreeting(history, locale, await getGreetingBank()), familyId);
}

/**
 * Prefetch: generuje w tle warianty, które będą potrzebne najbliżej (pierwsze spotkanie + powrót następnego dnia).
 * Wywoływane po onboardingu i po odsłuchaniu bajki.
 */
export async function prefetchGreetings(familyId: string, ctx: TemplateContext, locale: Locale, nextStoryDay: number) {
  const history = await greetingHistory(familyId, nextStoryDay);
  const kinds = new Set([pickGreetingKind(history), "RETURNING_NEXT_DAY" as const]);
  const bank = await getGreetingBank();
  const variants: GreetingVariant[] = [];
  for (const kind of kinds) {
    const list = variantsFor(kind, locale, bank);
    variants.push(list[(Math.max(1, nextStoryDay) - 1) % list.length]);
  }
  const results = [];
  for (const v of variants) {
    try {
      results.push(await ensureGreetingAudio(ctx, v, familyId));
    } catch (e) {
      console.warn("[greetings] prefetch failed", v.id, (e as Error).message);
    }
  }
  return results;
}

/** Generator zestawu powitań dla profilu testowego (panel admina). */
export async function generateGreetingSet(ctx: TemplateContext, locale: Locale) {
  const out = [];
  for (const v of (await getGreetingBank()).filter((g) => g.locale === locale)) out.push(await ensureGreetingAudio(ctx, v, null));
  return out;
}

export function ttsProviderName() {
  return getTts().name;
}

