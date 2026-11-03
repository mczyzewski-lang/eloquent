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
  synthesize(text: string, voice: VoiceProfile, language: string): Promise<TtsResult>;
}

export const DEFAULT_VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 };

export function currentVoiceProfile(): VoiceProfile {
  return {
    voiceId: config.elevenlabs.voiceId || "mock-elofik-voice",
    modelId: config.elevenlabs.ttsModel,
    voiceVersion: config.elevenlabs.voiceVersion,
    settings: DEFAULT_VOICE_SETTINGS,
  };
}

class ElevenLabsTts implements TtsProvider {
  readonly name = "elevenlabs" as const;
  async synthesize(text: string, voice: VoiceProfile, language: string): Promise<TtsResult> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}?output_format=${config.elevenlabs.outputFormat}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": config.elevenlabs.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: voice.modelId, language_code: language, voice_settings: voice.settings }),
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

const g = globalThis as unknown as { __elofikTts?: TtsProvider };
export function getTts(): TtsProvider {
  if (!g.__elofikTts) g.__elofikTts = hasElevenLabs() ? new ElevenLabsTts() : new MockTts();
  return g.__elofikTts;
}
export function setTtsForTests(p: TtsProvider) {
  g.__elofikTts = p;
}
export { MockTts };
