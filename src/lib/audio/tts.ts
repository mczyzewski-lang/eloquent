/**
 * Dostawcy TTS. ElevenLabs po stronie serwera (klucz nigdy nie trafia do przeglądarki).
 * Mock: generuje WAV o długości tekstu — umożliwia pełne demo i testy bez kosztów.
 */
import { config, hasElevenLabs } from "@/lib/config";
import type { VoiceProfile } from "@/lib/domain/story";
import { mockSpeechWav } from "./wav";

export interface TtsResult {
  audio: Buffer;
  contentType: "audio/mpeg" | "audio/wav";
  ext: "mp3" | "wav";
  chars: number;
}

export interface TtsProvider {
  readonly name: "elevenlabs" | "mock";
  synthesize(text: string, voice: VoiceProfile, language: string, context?: TtsContext): Promise<TtsResult>;
}

export interface TtsContext {
  previousText?: string;
  nextText?: string;
}

/** previous_text/next_text (sklejanie fragmentów) — tylko modele v2/flash/turbo; v3+ ich nie przyjmują. */
export function ttsStitchingParams(model: string, context?: TtsContext): { previous_text?: string; next_text?: string } {
  if (!context || /^eleven_v\d+/.test(model)) return {};
  return { ...(context.previousText ? { previous_text: context.previousText.slice(-300) } : {}), ...(context.nextText ? { next_text: context.nextText.slice(0, 300) } : {}) };
}

export const DEFAULT_VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 };

/** eleven_v3 i nowsze (v4…) przyjmują tylko dyskretną stabilność; modele v2/flash/turbo — pełne ustawienia. */
export function voiceSettingsFor(model: string): Record<string, number | boolean> {
  return /^eleven_v\d+$/.test(model) && !/^eleven_v2$/.test(model) ? { stability: 0.5 } : DEFAULT_VOICE_SETTINGS;
}

/** language_code przyjmują tylko modele z wymuszaniem języka (flash/turbo v2.5); inne zwracają przy nim błąd 400. */
export function ttsLanguageParam(model: string, language: string): { language_code?: string } {
  return /(flash|turbo)_v2_5/.test(model) ? { language_code: language } : {};
}

export function currentVoiceProfile(): VoiceProfile {
  return {
    voiceId: config.elevenlabs.voiceId || "mock-elofik-voice",
    modelId: config.elevenlabs.ttsModel,
    voiceVersion: config.elevenlabs.voiceVersion,
    settings: voiceSettingsFor(config.elevenlabs.ttsModel),
  };
}

/** Głos narratora (ten sam model i ustawienia co Elofik). null = bajkę czyta jeden głos. */
export function narratorVoiceProfile(): VoiceProfile | null {
  const id = config.elevenlabs.narratorVoiceId;
  const elofik = currentVoiceProfile();
  // w trybie demo (bez ElevenLabs) narrator działa „na niby”: osobne klucze cache, ten sam syntezator
  if (!id || id === elofik.voiceId) return null;
  return { ...elofik, voiceId: id, voiceVersion: `NARRATOR_${id.slice(0, 8).toUpperCase()}` };
}

/** Głos pozostałych postaci (wiewiórka, jeżyk…). null = ich kwestie czyta narrator. */
export function characterVoiceProfile(): VoiceProfile | null {
  const id = config.elevenlabs.characterVoiceId;
  const elofik = currentVoiceProfile();
  if (!id || id === elofik.voiceId || id === config.elevenlabs.narratorVoiceId) return null;
  return { ...elofik, voiceId: id, voiceVersion: `CHARACTER_${id.slice(0, 8).toUpperCase()}` };
}

class ElevenLabsTts implements TtsProvider {
  readonly name = "elevenlabs" as const;
  async synthesize(text: string, voice: VoiceProfile, language: string, context?: TtsContext): Promise<TtsResult> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}?output_format=${config.elevenlabs.outputFormat}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": config.elevenlabs.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: voice.modelId, ...ttsLanguageParam(voice.modelId, language), ...ttsStitchingParams(voice.modelId, context), voice_settings: voice.settings }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return { audio: Buffer.from(await res.arrayBuffer()), contentType: "audio/mpeg", ext: "mp3", chars: text.length };
      lastErr = new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw lastErr;
  }
}

class MockTts implements TtsProvider {
  readonly name = "mock" as const;
  calls = 0;
  async synthesize(text: string): Promise<TtsResult> {
    this.calls++;
    const { wav } = mockSpeechWav(text);
    return { audio: wav, contentType: "audio/wav", ext: "wav", chars: text.length };
  }
}

const g = globalThis as unknown as { __elofikTts?: TtsProvider; __elofikTtsReal?: TtsProvider; __elofikTtsMock?: TtsProvider };
/** Dostawca wybierany przy każdym wywołaniu — klucz może zostać dodany w panelu admina bez restartu. */
export function getTts(): TtsProvider {
  if (g.__elofikTts) return g.__elofikTts; // podmiana w testach
  if (hasElevenLabs()) return (g.__elofikTtsReal ??= new ElevenLabsTts());
  return (g.__elofikTtsMock ??= new MockTts());
}
export function setTtsForTests(p: TtsProvider) {
  g.__elofikTts = p;
}
export { MockTts };
