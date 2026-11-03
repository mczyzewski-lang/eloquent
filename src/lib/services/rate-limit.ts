import { getDb } from "@/lib/db";
import { sha256 } from "@/lib/domain/hash";

/** Okno stałe (fixed window). Klucz zawiera hash IP — nie przechowujemy surowych adresów. */
export async function rateLimit(bucket: string, identity: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const key = `${bucket}:${sha256(identity).slice(0, 32)}`;
  const count = await getDb().incrementCounter(key, windowStart);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

function windowKey(bucket: string, identity: string, windowSeconds: number) {
  return {
    key: `${bucket}:${sha256(identity).slice(0, 32)}`,
    windowStart: new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString(),
  };
}

/** Odczyt licznika bez zwiększania (np. czy przekroczono limit nieudanych prób). */
export async function isLimited(bucket: string, identity: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { key, windowStart } = windowKey(bucket, identity, windowSeconds);
  const row = await getDb().findOne("rate_limits", { key, window_start: windowStart });
  return (row?.count ?? 0) >= limit;
}

/** Zarejestrowanie zdarzenia (np. nieudanej próby logowania). */
export async function hit(bucket: string, identity: string, windowSeconds: number): Promise<void> {
  const { key, windowStart } = windowKey(bucket, identity, windowSeconds);
  await getDb().incrementCounter(key, windowStart);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}
