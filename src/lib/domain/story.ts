/**
 * Architektura bajki: wspólny rdzeń (CORE) generowany raz + krótkie segmenty personalizowane.
 * Plan renderu jest czystą funkcją — łatwo testowalną i deterministyczną.
 */
import { ttsCacheKey, assemblyKey, type TtsCacheInput } from "./hash";
import { applyPronunciation, PRONUNCIATION_VERSION } from "./pronunciation";
import { renderTemplate, requiredRelations, usesChild, type TemplateContext, type RelationType } from "./templates";
import type { Locale } from "./command-matcher";

export type SegmentType = "CORE" | "PERSONALIZED_CHILD" | "PERSONALIZED_FAMILY" | "OPTIONAL" | "EDUCATIONAL";

export interface StorySegment {
  id: string;
  order: number;
  type: SegmentType;
  /** Szablon tekstu. Dla CORE/EDUCATIONAL bez zmiennych. */
  text: string;
  /** Tekst zastępczy, gdy brakuje bliskiej osoby (bez zmiennych rodzinnych). */
  fallbackText?: string | null;
  /** Pauza po segmencie (ms) */
  pauseAfterMs?: number;
}

export type ProductionStatus = "draft" | "in_review" | "approved" | "core_generated" | "published" | "archived";
export type AgeGroup = "4-5" | "6-7" | "4-7";

export interface StoryVersion {
  storyId: string;
  version: number;
  dayNumber: number;
  title: string;
  ageGroup: AgeGroup;
  locale: Locale;
  wordOfDay: string;
  wordDefinition: string;
  educationalGoal: string;
  summary: string;
  ending: string;
  parentQuestion: string;
  illustrationPrompt: string;
  coverImage: string;
  reviewWords: string[];
  interests: string[];
  estimatedMinutes: number;
  status: ProductionStatus;
  segments: StorySegment[];
}

export interface VoiceProfile {
  voiceId: string;
  modelId: string;
  voiceVersion: string;
  settings: Record<string, number | boolean | string>;
}

export const MASTERING_VERSION = "MASTER_V1";

export interface PlannedSegment {
  segmentId: string;
  type: SegmentType;
  text: string;
  cacheKey: string;
  /** true = segment wspólny dla wszystkich rodzin (CORE, EDUCATIONAL, fallback) */
  shared: boolean;
  pauseAfterMs: number;
}

export interface RenderPlan {
  storyId: string;
  version: number;
  segments: PlannedSegment[];
  assemblyKey: string;
}

function keyFor(text: string, story: StoryVersion, voice: VoiceProfile): string {
  const input: TtsCacheInput = {
    text,
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    voiceSettings: voice.settings,
    language: story.locale,
    // CORE jest niezależny od wersji szablonu personalizacji — klucz bazuje na tekście
    templateVersion: `${story.storyId}`,
    pronunciationVersion: PRONUNCIATION_VERSION,
  };
  return ttsCacheKey(input);
}

export function buildRenderPlan(story: StoryVersion, ctx: TemplateContext | null, voice: VoiceProfile): RenderPlan {
  const ordered = [...story.segments].sort((a, b) => a.order - b.order);
  const planned: PlannedSegment[] = [];
  for (const seg of ordered) {
    const pauseAfterMs = seg.pauseAfterMs ?? 450;
    if (seg.type === "CORE" || seg.type === "EDUCATIONAL") {
      const text = applyPronunciation(seg.text);
      planned.push({ segmentId: seg.id, type: seg.type, text, cacheKey: keyFor(text, story, voice), shared: true, pauseAfterMs });
      continue;
    }
    const needsFamily: RelationType[] = requiredRelations(seg.text);
    const familyMissing = !ctx || needsFamily.some((r) => !ctx.family[r]);
    const childMissing = !ctx && usesChild(seg.text);
    if (familyMissing || childMissing) {
      if (seg.type === "OPTIONAL" || !seg.fallbackText) continue; // historia ma sens bez segmentu
      // fallback może zawierać {child} — renderujemy z dzieckiem, jeśli jest
      const fbText = ctx ? renderTemplate(seg.fallbackText, { ...ctx, family: {} }) : seg.fallbackText;
      const text = applyPronunciation(fbText);
      const shared = !usesChild(seg.fallbackText);
      planned.push({ segmentId: seg.id, type: seg.type, text, cacheKey: keyFor(text, story, voice), shared, pauseAfterMs });
      continue;
    }
    const text = applyPronunciation(renderTemplate(seg.text, ctx!));
    const shared = needsFamily.length === 0 && !usesChild(seg.text);
    planned.push({ segmentId: seg.id, type: seg.type, text, cacheKey: keyFor(text, story, voice), shared, pauseAfterMs });
  }
  const aKey = assemblyKey(
    planned.map((p) => `${p.cacheKey}:${p.pauseAfterMs}`),
    `${MASTERING_VERSION}:${story.storyId}:v${story.version}`,
  );
  return { storyId: story.storyId, version: story.version, segments: planned, assemblyKey: aKey };
}

export function personalizedSegmentCount(story: StoryVersion): number {
  return story.segments.filter((s) => s.type === "PERSONALIZED_CHILD" || s.type === "PERSONALIZED_FAMILY" || s.type === "OPTIONAL").length;
}

/** Walidacja redakcyjna przed publikacją. Zwraca listę problemów (pusta = OK). */
export function validateStory(story: StoryVersion): string[] {
  const issues: string[] = [];
  const word = story.wordOfDay.toLocaleLowerCase("pl");
  const full = story.segments.map((s) => s.text).join(" ").toLocaleLowerCase("pl");
  const occurrences = full.split(word.slice(0, Math.max(5, word.length - 3))).length - 1;
  if (occurrences < 3) issues.push(`Słowo dnia „${story.wordOfDay}” powinno pojawić się co najmniej 3 razy (jest ${occurrences}).`);
  const p = personalizedSegmentCount(story);
  if (p < 3 || p > 5) issues.push(`Zalecane 3–5 segmentów personalizowanych (jest ${p}).`);
  for (const s of story.segments) {
    if ((s.type === "CORE" || s.type === "EDUCATIONAL") && /\{[a-z]/.test(s.text)) issues.push(`Segment ${s.id} typu ${s.type} nie może zawierać zmiennych.`);
    if (s.type === "PERSONALIZED_FAMILY" && !s.fallbackText) issues.push(`Segment ${s.id} wymaga tekstu zastępczego (fallback), gdy bliskiej osoby nie ma.`);
    if (s.fallbackText && requiredRelations(s.fallbackText).length) issues.push(`Fallback segmentu ${s.id} nie może odwoływać się do bliskich.`);
  }
  const words = full.split(/\s+/).length;
  const minutes = words / 120; // ok. 120 słów/min dla spokojnej narracji dla dzieci
  if (minutes < 4.5 || minutes > 11) issues.push(`Szacowany czas ${minutes.toFixed(1)} min — cel to 5–10 minut.`);
  if (!story.parentQuestion.trim()) issues.push("Brak pytania dla rodzica.");
  if (/(św\.? mikołaj|renifer|choink|bożego narodzenia|dzwoneczk)/i.test(full)) issues.push("Treść zawiera motywy świąteczne — Elofik jest bohaterem całorocznym.");
  return issues;
}

export function estimateDurationSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / 120) * 60));
}
