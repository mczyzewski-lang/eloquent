import { getDb } from "@/lib/db";
import { sha256 } from "@/lib/domain/hash";

/** Okno stałe (fixed window). Klucz zawiera hash IP — nie przechowujemy surowych adresów. */
export async function rateLimit(bucket: string, identity: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const key = `${bucket}:${sha256(identity).slice(0, 32)}`;
  const count = await getDb().incrementCounter(key, windowStart);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}
