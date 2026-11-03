/**
 * Powitania „Hej Elofik!”: wybór wariantu + audio z cache.
 * Generowane raz na (imię, wariant, głos) i przygotowywane z wyprzedzeniem (prefetch).
 */
import { getDb, nowIso } from "@/lib/db";
import { ttsCacheKey } from "@/lib/domain/hash";
import { applyPronunciation, PRONUNCIATION_VERSION } from "@/lib/domain/pronunciation";
import { GREETING_TEMPLATE_VERSION, mergeGreetingBank, pickGreeting, pickGreetingKind, variantsFor, type GreetingVariant } from "@/lib/domain/greetings";
import { nameCacheKey } from "@/lib/domain/names";
import { renderTemplate, type TemplateContext } from "@/lib/domain/templates";
import type { Locale } from "@/lib/domain/command-matcher";
import { currentVoiceProfile, getTts } from "@/lib/audio/tts";
import { ensureSegmentAudio, signedAudioUrl } from "./audio-pipeline";
import { lastListenedAt } from "./progress";

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

/** Zapewnia audio wariantu (z cache lub nowe TTS). */
export async function ensureGreetingAudio(ctx: TemplateContext, variant: GreetingVariant, familyId: string | null): Promise<PreparedGreeting> {
  const db = getDb();
  const voice = currentVoiceProfile();
  const text = applyPronunciation(renderTemplate(variant.template, ctx));
  const nameKey = nameCacheKey(ctx.child.name);
  const found = await db.findOne("greeting_audio_cache", { child_name_key: nameKey, variant_id: variant.id, voice_version: voice.voiceVersion, locale: variant.locale, address: ctx.child.address });
  // po edycji tekstu w panelu admina stary plik nie pasuje — generujemy nowy
  const existing = found && found.text === text ? found : null;
  const cacheKey = existing?.cache_key ?? greetingCacheKey(text, variant.locale);
  const audio = await ensureSegmentAudio(text, cacheKey, { purpose: "greeting", familyId, segmentType: "GREETING", shared: false, language: variant.locale });
  if (!existing) {
    if (found) await db.delete("greeting_audio_cache", { id: found.id });
    await db.upsert(
      "greeting_audio_cache",
      { child_name_key: nameKey, variant_id: variant.id, voice_version: voice.voiceVersion, locale: variant.locale, address: ctx.child.address, cache_key: cacheKey, text, created_at: nowIso() },
      ["child_name_key", "variant_id", "voice_version", "locale", "address"],
    );
  }
  return {
    variantId: variant.id,
    kind: variant.kind,
    text,
    audioUrl: await signedAudioUrl(audio.storage_path),
    provider: audio.provider,
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

