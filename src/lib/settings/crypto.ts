/**
 * Szyfrowanie sekretów zapisanych w bazie (AES-256-GCM).
 * Klucz pochodzi z SESSION_SECRET — wyciek samej bazy nie ujawnia kluczy API.
 * Zmiana SESSION_SECRET unieważnia zapisane sekrety (trzeba je wpisać ponownie).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFrom(secret: string) {
  return createHash("sha256").update(`elofik-settings:${secret}`).digest();
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, secret: string): string | null {
  try {
    const [v, iv, tag, data] = payload.split(".");
    if (v !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** „sk-…abcd” — do wyświetlenia w panelu bez ujawniania sekretu. */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}…${value.slice(-4)}`;
}
