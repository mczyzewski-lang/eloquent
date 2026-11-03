import { createHash } from "node:crypto";

/** Normalizacja tekstu przed TTS i hashowaniem — identyczna treść = identyczny plik. */
export function normalizeTtsText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export interface TtsCacheInput {
  text: string;
  voiceId: string;
  modelId: string;
  voiceSettings: Record<string, number | boolean | string>;
  language: string;
  templateVersion: string;
  pronunciationVersion: string;
}

/** Deterministyczny klucz cache segmentu TTS (sha256). */
export function ttsCacheKey(input: TtsCacheInput): string {
  const payload = stableStringify({ ...input, text: normalizeTtsText(input.text) });
  return createHash("sha256").update(payload).digest("hex");
}

/** Klucz złożonego pliku bajki: kolejność segmentów + pauzy + wersja masteringu. */
export function assemblyKey(segmentKeys: string[], masteringVersion: string): string {
  return createHash("sha256").update(stableStringify({ segmentKeys, masteringVersion })).digest("hex");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
