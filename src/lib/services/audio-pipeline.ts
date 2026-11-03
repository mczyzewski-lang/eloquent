/**
 * Pipeline audio: manifest → plan → cache segmentów → (brakujące) TTS → FFmpeg → gotowy plik.
 * CORE generowany raz dla wszystkich rodzin; personalizacja tylko dla brakujących segmentów.
 */
import { config } from "@/lib/config";
import { getDb, nowIso, type AudioAssemblyRow, type AudioCacheRow } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getTts, currentVoiceProfile } from "@/lib/audio/tts";
import { assembleSegments } from "@/lib/audio/ffmpeg";
import { wavDurationMs } from "@/lib/audio/wav";
import { estimateTtsUsd, type CostPurpose } from "@/lib/domain/budget";
import { buildRenderPlan, type PlannedSegment, type RenderPlan, type StoryVersion } from "@/lib/domain/story";
import type { TemplateContext } from "@/lib/domain/templates";
import { assertBudget, recordCost } from "./costs";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

const inflight = new Map<string, Promise<unknown>>();

/** Deduplikacja równoległych generacji tego samego klucza w obrębie procesu. */
function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export interface SegmentContext {
  purpose: CostPurpose;
  familyId?: string | null;
  storyId?: string | null;
  segmentType?: string;
  shared?: boolean;
  language?: string;
  previousText?: string;
  nextText?: string;
}

export async function ensureSegmentAudio(text: string, cacheKey: string, ctx: SegmentContext): Promise<AudioCacheRow> {
  await ensureRuntimeSettings();
  const db = getDb();
  const hit = await db.findOne("audio_cache", { cache_key: cacheKey });
  if (hit) {
    await db.update("audio_cache", { id: hit.id }, { hits: hit.hits + 1 });
    await recordCost({ provider: "elevenlabs_tts", purpose: ctx.purpose, usd: 0, units: 0, cacheHit: true, familyId: ctx.familyId, storyId: ctx.storyId });
    return hit;
  }
  return once(`seg:${cacheKey}`, async () => {
    const again = await db.findOne("audio_cache", { cache_key: cacheKey });
    if (again) return again;
    const tts = getTts();
    const estimated = estimateTtsUsd(text.length, config.elevenlabs.ttsUsdPer1kChars);
    if (tts.name !== "mock") await assertBudget(ctx.purpose, estimated);
    const voice = currentVoiceProfile();
    const res = await tts.synthesize(text, voice, ctx.language ?? "pl", { previousText: ctx.previousText, nextText: ctx.nextText });
    const storagePath = `tts/${cacheKey.slice(0, 2)}/${cacheKey}.${res.ext}`;
    await getStorage().put(storagePath, res.audio, res.contentType);
    const row = await db.upsert(
      "audio_cache",
      {
        cache_key: cacheKey,
        storage_path: storagePath,
        duration_ms: res.ext === "wav" ? wavDurationMs(res.audio) : 0,
        chars: res.chars,
        provider: tts.name,
        voice_version: voice.voiceVersion,
        segment_type: ctx.segmentType ?? "UNKNOWN",
        shared: ctx.shared ?? false,
        hits: 0,
        created_at: nowIso(),
      },
      ["cache_key"],
    );
    await recordCost({
      provider: "elevenlabs_tts",
      purpose: ctx.purpose,
      usd: tts.name === "mock" ? 0 : estimated,
      units: res.chars,
      familyId: ctx.familyId,
      storyId: ctx.storyId,
    });
    return row;
  });
}

export interface AssemblyResult {
  assembly: AudioAssemblyRow;
  plan: RenderPlan;
  generatedSegments: number;
  reusedSegments: number;
}

export async function assemblePlan(plan: RenderPlan, opts: { familyId?: string | null; purposeShared?: CostPurpose; purposePersonal?: CostPurpose; language?: string }): Promise<AssemblyResult> {
  const db = getDb();
  const existing = await db.findOne("audio_assemblies", { assembly_key: plan.assemblyKey });
  if (existing) return { assembly: existing, plan, generatedSegments: 0, reusedSegments: plan.segments.length };

  return once(`asm:${plan.assemblyKey}`, async () => {
    let generated = 0;
    let reused = 0;
    const rows: { seg: PlannedSegment; row: AudioCacheRow }[] = [];
    for (const seg of plan.segments) {
      const before = await db.findOne("audio_cache", { cache_key: seg.cacheKey });
      const row = await ensureSegmentAudio(seg.text, seg.cacheKey, {
        purpose: seg.shared ? (opts.purposeShared ?? "core") : (opts.purposePersonal ?? "personalization"),
        familyId: seg.shared ? null : opts.familyId,
        storyId: plan.storyId,
        segmentType: seg.type,
        shared: seg.shared,
        language: opts.language,
        previousText: seg.previousText,
        nextText: seg.nextText,
      });
      if (before) reused++;
      else generated++;
      rows.push({ seg, row });
    }
    const storage = getStorage();
    const parts = await Promise.all(
      rows.map(async ({ seg, row }) => {
        const audio = await storage.get(row.storage_path);
        if (!audio) throw new Error(`Brak pliku segmentu ${row.storage_path}`);
        return { audio, ext: row.storage_path.endsWith(".wav") ? ("wav" as const) : ("mp3" as const), pauseAfterMs: seg.pauseAfterMs };
      }),
    );
    const out = await assembleSegments(parts);
    let t = 0;
    const timeline = rows.map(({ seg }, i) => {
      const startMs = t;
      const endMs = t + out.segmentDurationsMs[i];
      t = endMs + seg.pauseAfterMs;
      return { segmentId: seg.segmentId, startMs, endMs, text: seg.text };
    });
    const storagePath = `assemblies/${plan.storyId}/${plan.assemblyKey}.${out.ext}`;
    await storage.put(storagePath, out.audio, out.contentType);
    const assembly = await db.upsert(
      "audio_assemblies",
      {
        assembly_key: plan.assemblyKey,
        story_id: plan.storyId,
        story_version: plan.version,
        storage_path: storagePath,
        duration_ms: out.durationMs,
        segment_keys: plan.segments.map((s) => s.cacheKey),
        timeline,
        created_at: nowIso(),
      },
      ["assembly_key"],
    );
    return { assembly, plan, generatedSegments: generated, reusedSegments: reused };
  });
}

/** Renderuje bajkę dla rodziny (lub wersję bez personalizacji, gdy ctx = null). */
export async function renderStoryForFamily(story: StoryVersion, ctx: TemplateContext | null, familyId: string | null): Promise<AssemblyResult> {
  await ensureRuntimeSettings();
  const plan = buildRenderPlan(story, ctx, currentVoiceProfile());
  const res = await assemblePlan(plan, { familyId, language: story.locale });
  if (familyId) {
    await getDb().upsert("family_assemblies", { family_id: familyId, story_id: story.storyId, assembly_key: plan.assemblyKey, created_at: nowIso() }, ["family_id", "story_id"]);
  }
  return res;
}

/** Generuje wyłącznie wspólne segmenty (CORE/EDUCATIONAL/fallback) — uruchamiane raz przy publikacji. */
export async function generateCore(story: StoryVersion) {
  await ensureRuntimeSettings();
  const plan = buildRenderPlan(story, null, currentVoiceProfile());
  let generated = 0;
  for (const seg of plan.segments.filter((s) => s.shared)) {
    const before = await getDb().findOne("audio_cache", { cache_key: seg.cacheKey });
    await ensureSegmentAudio(seg.text, seg.cacheKey, { purpose: "core", storyId: story.storyId, segmentType: seg.type, shared: true, language: story.locale });
    if (!before) generated++;
  }
  return { generated, total: plan.segments.filter((s) => s.shared).length };
}

export async function signedAudioUrl(storagePath: string, ttlSeconds = 3 * 3600) {
  return getStorage().signedUrl(storagePath, ttlSeconds);
}
