/**
 * Wybór głosu Elofika w panelu admina.
 *
 * 1. Voice Design (ElevenLabs Text-to-Voice): z opisu powstaje kilka podglądów głosu,
 *    każdy od razu czyta tekst demo w roli Elofika.
 * 2. Zapisanie wybranego podglądu jako stałego głosu w bibliotece ElevenLabs.
 * 3. Alternatywnie: głosy już obecne w bibliotece + krótkie demo TTS.
 * 4. „Ustaw jako wiodący” → elevenlabs_voice_id + nowa wersja głosu (nowe klucze cache).
 *
 * Każda płatna operacja przechodzi przez budżet AI i jest logowana w kosztach.
 */
import { config } from "@/lib/config";
import { getDb, nowIso, type VoiceCandidateRow } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { estimateTtsUsd } from "@/lib/domain/budget";
import { ttsLanguageParam, voiceSettingsFor } from "@/lib/audio/tts";
import { ensureRuntimeSettings, saveSetting } from "@/lib/settings/runtime";
import { assertBudget, recordCost } from "./costs";

const API = "https://api.elevenlabs.io";

/** Tekst demo (100–1000 znaków — wymóg Voice Design): powitanie + fragment bajki. */
export const VOICE_DEMO_TEXT =
  "Heeej, Leonku! Tu Elofik, mały elf opowieści. Ale się cieszę, że znowu jesteś! Dzisiaj w mojej torbie na słowa schowałem coś niezwykłego: słowo dociekliwość. A wszystko zaczęło się od tajemniczego, srebrzystego śladu w zaczarowanym lesie… Usiądź wygodnie i posłuchaj!";

/** Gotowe opisy głosu do Voice Design (można je edytować w panelu). */
export const VOICE_PRESETS: { name: string; description: string }[] = [
  {
    name: "Ciepły opowiadacz",
    description:
      "A warm, gentle young male storyteller voice speaking Polish with a native Polish accent. Friendly, soft and smiling, slightly playful, calm bedtime-story pace, clear articulation, cozy and trustworthy, perfect for children aged 4-7.",
  },
  {
    name: "Wesoły elf",
    description:
      "A bright, cheerful, youthful elf character voice speaking Polish with a native Polish accent. Light and expressive with gentle excitement and a sparkle of magic, never shrill or cartoonish, warm and kind, ideal for narrating children's audiobooks.",
  },
  {
    name: "Spokojny, na dobranoc",
    description:
      "A calm, soothing, soft-spoken male narrator voice speaking Polish with a native Polish accent. Slow and tender bedtime pace, warm low-mid tone, very clear diction, reassuring and magical, for gentle stories for small children.",
  },
];

export class VoiceStudioError extends Error {}

function apiKey() {
  const k = config.elevenlabs.apiKey;
  if (!k) throw new VoiceStudioError("Brak klucza ElevenLabs — dodaj go w Admin → Ustawienia i klucze API.");
  return k;
}

async function el(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": apiKey(), "content-type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    throw Object.assign(new VoiceStudioError(`ElevenLabs ${res.status}: ${body}`), { status: res.status });
  }
  return res;
}

interface DesignPreview {
  audio_base_64: string;
  generated_voice_id: string;
  media_type?: string;
}

/** Projektuje głosy z opisu. Zwraca zapisanych kandydatów (z próbkami w storage). */
export async function designVoices(input: { name: string; description: string; model?: string; text?: string }): Promise<VoiceCandidateRow[]> {
  await ensureRuntimeSettings();
  const text = (input.text?.trim() || VOICE_DEMO_TEXT).slice(0, 1000);
  if (text.length < 100) throw new VoiceStudioError("Tekst demo musi mieć co najmniej 100 znaków.");
  const description = input.description.trim().slice(0, 1000);
  if (description.length < 20) throw new VoiceStudioError("Opis głosu jest za krótki (min. 20 znaków).");
  // Voice Design zwraca zwykle 3 podglądy; koszt ≈ 3× znaki tekstu
  const estimate = estimateTtsUsd(text.length * 3, config.elevenlabs.ttsUsdPer1kChars);
  apiKey(); // najpierw brak klucza (czytelniejszy komunikat niż brak budżetu)
  await assertBudget("preview", estimate);

  let previews: DesignPreview[];
  try {
    const res = await el("/v1/text-to-voice/design", {
      method: "POST",
      body: JSON.stringify({ voice_description: description, text, model_id: input.model || "eleven_multilingual_ttv_v2" }),
    });
    previews = ((await res.json()) as { previews?: DesignPreview[] }).previews ?? [];
  } catch (e) {
    // starsze konta / API: create-previews
    if ((e as { status?: number }).status !== 404) throw e;
    const res = await el("/v1/text-to-voice/create-previews", { method: "POST", body: JSON.stringify({ voice_description: description, text }) });
    previews = ((await res.json()) as { previews?: DesignPreview[] }).previews ?? [];
  }
  if (!previews.length) throw new VoiceStudioError("ElevenLabs nie zwrócił podglądów głosu. Zmień opis i spróbuj ponownie.");
  await recordCost({ provider: "elevenlabs_tts", purpose: "preview", usd: estimate, units: text.length * previews.length });

  const db = getDb();
  const storage = getStorage();
  const out: VoiceCandidateRow[] = [];
  for (const [i, p] of previews.entries()) {
    const ext = (p.media_type ?? "audio/mpeg").includes("wav") ? "wav" : "mp3";
    const path = `voices/previews/${p.generated_voice_id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60)}.${ext}`;
    await storage.put(path, Buffer.from(p.audio_base_64, "base64"), ext === "wav" ? "audio/wav" : "audio/mpeg");
    out.push(
      await db.insert("voice_candidates", {
        source: "design",
        name: `${input.name.trim().slice(0, 60) || "Projekt"} #${i + 1}`,
        description,
        generated_voice_id: p.generated_voice_id,
        voice_id: null,
        preview_path: path,
        demo_text: text,
        created_at: nowIso(),
      }),
    );
  }
  return out;
}

/** Zapisuje podgląd z Voice Design jako stały głos w bibliotece ElevenLabs. */
export async function saveDesignedVoice(candidateId: string): Promise<VoiceCandidateRow> {
  await ensureRuntimeSettings();
  const db = getDb();
  const c = await db.findOne("voice_candidates", { id: candidateId });
  if (!c) throw new VoiceStudioError("Nie znaleziono kandydata.");
  if (c.voice_id) return c;
  if (!c.generated_voice_id) throw new VoiceStudioError("Ten kandydat nie pochodzi z Voice Design.");
  const body = JSON.stringify({ voice_name: `Elofik — ${c.name}`.slice(0, 100), voice_description: c.description.slice(0, 1000), generated_voice_id: c.generated_voice_id });
  let voiceId: string | undefined;
  try {
    voiceId = ((await (await el("/v1/text-to-voice", { method: "POST", body })).json()) as { voice_id?: string }).voice_id;
  } catch (e) {
    if ((e as { status?: number }).status !== 404) throw e;
    voiceId = ((await (await el("/v1/text-to-voice/create-voice-from-preview", { method: "POST", body })).json()) as { voice_id?: string }).voice_id;
  }
  if (!voiceId) throw new VoiceStudioError("ElevenLabs nie zwrócił identyfikatora głosu.");
  return (await db.update("voice_candidates", { id: c.id }, { voice_id: voiceId }))[0];
}

export interface LibraryVoice {
  voiceId: string;
  name: string;
  category: string | null;
  description: string | null;
  previewUrl: string | null;
  languages: string[];
}

/** Głosy dostępne na koncie ElevenLabs (własne, zaprojektowane, dodane z biblioteki). */
export async function listLibraryVoices(): Promise<LibraryVoice[]> {
  await ensureRuntimeSettings();
  const res = await el("/v1/voices", { method: "GET" });
  const voices = ((await res.json()) as { voices?: { voice_id: string; name: string; category?: string; description?: string; preview_url?: string; labels?: Record<string, string>; verified_languages?: { language: string }[] }[] }).voices ?? [];
  return voices.map((v) => ({
    voiceId: v.voice_id,
    name: v.name,
    category: v.category ?? null,
    description: v.description ?? v.labels?.description ?? null,
    previewUrl: v.preview_url ?? null,
    languages: (v.verified_languages ?? []).map((l) => l.language),
  }));
}

/** Krótkie demo dowolnego głosu (TTS tekstu demo) — zapisywane, by nie płacić drugi raz. */
export async function demoLibraryVoice(voiceId: string, name: string): Promise<VoiceCandidateRow> {
  await ensureRuntimeSettings();
  if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) throw new VoiceStudioError("Nieprawidłowy Voice ID.");
  const db = getDb();
  const existing = await db.findOne("voice_candidates", { voice_id: voiceId, source: "library" });
  if (existing?.preview_path) return existing;
  const estimate = estimateTtsUsd(VOICE_DEMO_TEXT.length, config.elevenlabs.ttsUsdPer1kChars);
  apiKey();
  await assertBudget("preview", estimate);
  const res = await el(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${config.elevenlabs.outputFormat}`, {
    method: "POST",
    headers: { accept: "audio/mpeg" },
    body: JSON.stringify({ text: VOICE_DEMO_TEXT, model_id: config.elevenlabs.ttsModel, ...ttsLanguageParam(config.elevenlabs.ttsModel, "pl"), voice_settings: voiceSettingsFor(config.elevenlabs.ttsModel) }),
  });
  const path = `voices/demos/${voiceId}.mp3`;
  await getStorage().put(path, Buffer.from(await res.arrayBuffer()), "audio/mpeg");
  await recordCost({ provider: "elevenlabs_tts", purpose: "preview", usd: estimate, units: VOICE_DEMO_TEXT.length });
  const row = { source: "library" as const, name: name.slice(0, 80), description: "", generated_voice_id: null, voice_id: voiceId, preview_path: path, demo_text: VOICE_DEMO_TEXT, created_at: nowIso() };
  return existing ? (await db.update("voice_candidates", { id: existing.id }, row))[0] : db.insert("voice_candidates", row);
}

export interface TtsModelInfo {
  id: string;
  name: string;
  polish: boolean;
}

/** Modele Voice Design (text-to-voice). */
export const VOICE_DESIGN_MODELS = ["eleven_multilingual_ttv_v2", "eleven_ttv_v3"];
const FALLBACK_TTS_MODELS = ["eleven_multilingual_v2", "eleven_v3", "eleven_flash_v2_5", "eleven_turbo_v2_5"];

/**
 * Modele TTS dostępne na koncie (GET /v1/models) z obsługą polskiego — v2, v3 i każdy nowszy (np. v4), jeśli konto go ma.
 */
export async function listTtsModels(): Promise<TtsModelInfo[]> {
  await ensureRuntimeSettings();
  try {
    const res = await el("/v1/models", { method: "GET" });
    const models = (await res.json()) as { model_id: string; name?: string; can_do_text_to_speech?: boolean; languages?: { language_id: string }[] }[];
    const out = models
      .filter((m) => m.can_do_text_to_speech !== false && !/ttv|sts|scribe|music/i.test(m.model_id))
      .map((m) => ({ id: m.model_id, name: m.name ?? m.model_id, polish: (m.languages ?? []).some((l) => l.language_id === "pl") }));
    const pl = out.filter((m) => m.polish);
    if (pl.length) return pl;
    if (out.length) return out;
  } catch (e) {
    if (e instanceof VoiceStudioError && /Brak klucza/.test(e.message)) throw e;
  }
  return FALLBACK_TTS_MODELS.map((id) => ({ id, name: id, polish: true }));
}

/**
 * Demo tego samego tekstu w kilku modelach TTS (porównanie v2 / v3 / …).
 * Podgląd z Voice Design jest najpierw zapisywany jako głos (zwykłe TTS wymaga voice_id).
 */
export async function renderModelDemos(candidateId: string, models: string[]): Promise<VoiceCandidateRow> {
  await ensureRuntimeSettings();
  const db = getDb();
  let c = await db.findOne("voice_candidates", { id: candidateId });
  if (!c) throw new VoiceStudioError("Nie znaleziono kandydata.");
  if (!c.voice_id) c = await saveDesignedVoice(c.id);
  const voiceId = c.voice_id!;
  const list = models.filter((m) => /^eleven_[a-z0-9_]{2,40}$/.test(m)).slice(0, 8);
  const existing = new Map((c.model_demos ?? []).map((d) => [d.model, d]));
  const todo = list.filter((m) => !existing.get(m)?.path);
  apiKey();
  if (todo.length) await assertBudget("preview", estimateTtsUsd(c.demo_text.length * todo.length, config.elevenlabs.ttsUsdPer1kChars));
  const storage = getStorage();
  for (const model of todo) {
    try {
      const res = await el(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${config.elevenlabs.outputFormat}`, {
        method: "POST",
        headers: { accept: "audio/mpeg" },
        body: JSON.stringify({ text: c.demo_text || VOICE_DEMO_TEXT, model_id: model, ...ttsLanguageParam(model, "pl"), voice_settings: voiceSettingsFor(model) }),
      });
      const path = `voices/demos/${voiceId}-${model}.mp3`;
      await storage.put(path, Buffer.from(await res.arrayBuffer()), "audio/mpeg");
      await recordCost({ provider: "elevenlabs_tts", purpose: "preview", usd: estimateTtsUsd(c.demo_text.length, config.elevenlabs.ttsUsdPer1kChars), units: c.demo_text.length });
      existing.set(model, { model, path, error: null });
    } catch (e) {
      existing.set(model, { model, path: null, error: (e as Error).message.slice(0, 200) });
    }
  }
  const model_demos = list.map((m) => existing.get(m)!).filter(Boolean);
  return (await db.update("voice_candidates", { id: c.id }, { model_demos }))[0];
}

/** Ustawia głos (i opcjonalnie model TTS) jako wiodący. Nowa wersja = nowe klucze cache, kolejne nagrania już nowym głosem. */
export async function chooseLeadingVoice(voiceId: string, actorEmail: string, model?: string | null) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) throw new VoiceStudioError("Nieprawidłowy Voice ID.");
  if (model && !/^eleven_[a-z0-9_]{2,40}$/.test(model)) throw new VoiceStudioError("Nieprawidłowy model TTS.");
  const modelTag = model ? `_${model.replace(/^eleven_/, "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12)}` : "";
  const version = `VOICE_${voiceId.slice(0, 8).toUpperCase()}${modelTag}`;
  await saveSetting("elevenlabs_voice_id", voiceId, actorEmail);
  await saveSetting("elevenlabs_voice_version", version, actorEmail);
  if (model) await saveSetting("elevenlabs_tts_model", model, actorEmail);
  return { voiceId, version, model: model ?? config.elevenlabs.ttsModel };
}

export async function listCandidates(): Promise<VoiceCandidateRow[]> {
  return getDb().find("voice_candidates", {}, { orderBy: { column: "created_at", ascending: false }, limit: 60 });
}
