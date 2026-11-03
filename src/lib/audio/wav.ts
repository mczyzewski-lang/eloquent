/** Generowanie prostych plików WAV (PCM16 mono) — mock TTS i testy bez sieci. */
export const MOCK_SAMPLE_RATE = 22050;

export function encodeWav(samples: Float32Array, sampleRate = MOCK_SAMPLE_RATE): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

export function wavDurationMs(buf: Buffer): number {
  if (buf.toString("ascii", 0, 4) !== "RIFF") return 0;
  const byteRate = buf.readUInt32LE(28);
  const dataLen = buf.readUInt32LE(40);
  return Math.round((dataLen / byteRate) * 1000);
}

/**
 * „Mowa zastępcza”: delikatne, sylabiczne pomruki o długości odpowiadającej tekstowi.
 * Deterministyczne względem tekstu, dzięki czemu testy cache są powtarzalne.
 */
export function mockSpeechWav(text: string, wordsPerMinute = 120): { wav: Buffer; durationMs: number } {
  const words = text.split(/\s+/).filter(Boolean);
  const seconds = Math.max(0.8, (words.length / wordsPerMinute) * 60);
  const n = Math.round(seconds * MOCK_SAMPLE_RATE);
  const out = new Float32Array(n);
  let seed = 0;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const syllableLen = Math.round(MOCK_SAMPLE_RATE * 0.19);
  for (let i = 0; i < n; i++) {
    const syl = Math.floor(i / syllableLen);
    const pos = (i % syllableLen) / syllableLen;
    const f = 180 + ((seed >> syl % 16) & 63) * 2;
    const env = Math.sin(Math.PI * pos) ** 2 * (syl % 7 === 6 ? 0 : 1);
    out[i] = 0.08 * env * Math.sin((2 * Math.PI * f * i) / MOCK_SAMPLE_RATE);
  }
  return { wav: encodeWav(out), durationMs: Math.round(seconds * 1000) };
}

export function silenceWav(ms: number): Buffer {
  return encodeWav(new Float32Array(Math.round((ms / 1000) * MOCK_SAMPLE_RATE)));
}

/** Łączy WAV-y o identycznym formacie (fallback bez FFmpeg). */
export function concatWavs(parts: Buffer[]): Buffer {
  const pcm = parts.map((p) => p.subarray(44));
  const total = pcm.reduce((s, p) => s + p.length, 0);
  const head = Buffer.from(parts[0].subarray(0, 44));
  head.writeUInt32LE(36 + total, 4);
  head.writeUInt32LE(total, 40);
  return Buffer.concat([head, ...pcm]);
}
