/**
 * Bezpieczne tokeny dla linków prezentowych i aktywacyjnych.
 * W bazie przechowujemy wyłącznie hash tokenu — wyciek bazy nie ujawnia działających linków.
 */
import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";

export function generateSecureToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(`elofik-token:${token}`).digest("hex");
}

export function isTokenShapeValid(token: string): boolean {
  return /^[A-Za-z0-9_-]{24,64}$/.test(token);
}

export function isExpired(expiresAt: Date | string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export const FREE_GIFT_TTL_DAYS = 30;
export const GIFT_ACTIVATION_TTL_DAYS = 365;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** HMAC do podpisywania cookies sesji demo i krótkich URL-i audio. */
export function sign(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string, secret: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const expected = Buffer.from(sign(value, secret).slice(idx + 1));
  const given = Buffer.from(signed.slice(idx + 1));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return value;
}
