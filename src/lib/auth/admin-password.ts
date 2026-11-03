/**
 * Logowanie administratora hasłem (niezależne od Supabase i trybu demo).
 *
 * Konfiguracja (Railway → Variables):
 *   ADMIN_EMAILS=admin@elofik.com
 *   ADMIN_PASSWORD_HASH=scrypt:16384:8:1:<salt>:<hash>   ← `node scripts/hash-password.mjs "hasło"`
 *
 * W repozytorium i bazie nie ma hasła — tylko jego skrót scrypt w zmiennej środowiskowej.
 * Akceptowane separatory: „:” (zalecany) lub „$” (starszy format).
 */
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

const HASH_RE = /^scrypt[:$]\d+[:$]\d+[:$]\d+[:$][A-Za-z0-9_-]+[:$][A-Za-z0-9_-]+$/;

/** Usuwa przypadkowe cudzysłowy i spacje dodane przy wklejaniu zmiennej. */
function storedHash(): string {
  return (process.env.ADMIN_PASSWORD_HASH ?? "").trim().replace(/^["']|["']$/g, "");
}

/** Diagnostyka bez ujawniania wartości: czego brakuje w konfiguracji. */
export function adminConfigStatus() {
  const hash = storedHash();
  return {
    emails: config.adminEmails.length > 0,
    hash: Boolean(hash),
    hashFormatOk: HASH_RE.test(hash),
    sessionSecret: (process.env.SESSION_SECRET ?? "").length >= 32,
  };
}

export function adminPasswordConfigured(): boolean {
  const st = adminConfigStatus();
  return st.emails && st.hash && st.hashFormatOk;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.trim().replace(/^["']|["']$/g, "").split(/[:$]/);
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  try {
    const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const stored = storedHash();
  const emailOk = config.adminEmails.includes(email.trim().toLowerCase());
  // weryfikujemy hasło zawsze (stały czas odpowiedzi niezależnie od poprawności e-maila)
  const passOk = stored ? verifyPasswordHash(password, stored) : false;
  return emailOk && passOk;
}

/** Stabilny identyfikator konta admina (UUID v5-podobny z e-maila) — bez wiersza w auth.users. */
export function adminUserId(email: string): string {
  const h = createHash("sha256").update(`elofik-admin:${email.toLowerCase()}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
