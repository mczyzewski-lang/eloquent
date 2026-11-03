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
import { DEFAULT_VOICE_SETTINGS } from "@/lib/audio/tts";
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
    body: JSON.stringify({ text: VOICE_DEMO_TEXT, model_id: config.elevenlabs.ttsModel, language_code: "pl", voice_settings: DEFAULT_VOICE_SETTINGS }),
  });
  const path = `voices/demos/${voiceId}.mp3`;
  await getStorage().put(path, Buffer.from(await res.arrayBuffer()), "audio/mpeg");
  await recordCost({ provider: "elevenlabs_tts", purpose: "preview", usd: estimate, units: VOICE_DEMO_TEXT.length });
  const row = { source: "library" as const, name: name.slice(0, 80), description: "", generated_voice_id: null, voice_id: voiceId, preview_path: path, demo_text: VOICE_DEMO_TEXT, created_at: nowIso() };
  return existing ? (await db.update("voice_candidates", { id: existing.id }, row))[0] : db.insert("voice_candidates", row);
}

/** Ustawia głos jako wiodący. Nowa wersja głosu sprawia, że kolejne nagrania powstaną już nowym głosem. */
export async function chooseLeadingVoice(voiceId: string, actorEmail: string) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) throw new VoiceStudioError("Nieprawidłowy Voice ID.");
  const version = `VOICE_${voiceId.slice(0, 8).toUpperCase()}`;
  await saveSetting("elevenlabs_voice_id", voiceId, actorEmail);
  await saveSetting("elevenlabs_voice_version", version, actorEmail);
  return { voiceId, version };
}

export async function listCandidates(): Promise<VoiceCandidateRow[]> {
  return getDb().find("voice_candidates", {}, { orderBy: { column: "created_at", ascending: false }, limit: 60 });
}
