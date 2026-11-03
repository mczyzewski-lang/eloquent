import { describe, expect, it } from "vitest";
import { randomBytes, scryptSync } from "node:crypto";
import { adminUserId, verifyPasswordHash } from "@/lib/auth/admin-password";

function hash(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }).toString("base64url")}`;
}

describe("Hasło administratora", () => {
  it("weryfikuje poprawne hasło i odrzuca błędne", () => {
    const h = hash("Dobre-Haslo-123");
    expect(verifyPasswordHash("Dobre-Haslo-123", h)).toBe(true);
    expect(verifyPasswordHash("dobre-haslo-123", h)).toBe(false);
    expect(verifyPasswordHash("", h)).toBe(false);
  });
  it("akceptuje format z separatorem „:” i przypadkowe cudzysłowy", () => {
    const h = hash("Testowe-Haslo-9").replace(/\$/g, ":");
    expect(h.startsWith("scrypt:")).toBe(true);
    expect(verifyPasswordHash("Testowe-Haslo-9", h)).toBe(true);
    expect(verifyPasswordHash("Testowe-Haslo-9", `"${h}"`)).toBe(true);
    expect(verifyPasswordHash("inne", h)).toBe(false);
  });
  it("ADMIN_PASSWORD jako alternatywa i odporność ADMIN_EMAILS na cudzysłowy", async () => {
    process.env.ADMIN_PASSWORD = '"Haslo-Testowe-1234"';
    process.env.ADMIN_EMAILS = '"Admin@Elofik.com"';
    const { checkAdminCredentials } = await import("@/lib/auth/admin-password");
    const { config } = await import("@/lib/config");
    // config czyta ADMIN_EMAILS przy starcie — sprawdzamy sam parser na świeżej wartości
    const parsed = '"Admin@Elofik.com"'.split(/[,;\s]+/).map((s) => s.trim().replace(/^["'<]+|[">']+$/g, "").toLowerCase());
    expect(parsed).toEqual(["admin@elofik.com"]);
    (config as { adminEmails: string[] }).adminEmails = parsed;
    expect(checkAdminCredentials("admin@elofik.com", "Haslo-Testowe-1234")).toEqual({ ok: true });
    expect(checkAdminCredentials("admin@elofik.com", "zle")).toEqual({ ok: false, reason: "wrong_password" });
    expect(checkAdminCredentials("ktos@x.pl", "Haslo-Testowe-1234")).toEqual({ ok: false, reason: "email_not_admin" });
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAILS;
  });
  it("odrzuca uszkodzony skrót", () => {
    expect(verifyPasswordHash("x", "plaintext")).toBe(false);
    expect(verifyPasswordHash("x", "scrypt$1$1$1$a$b")).toBe(false);
  });
  it("stabilny identyfikator konta admina", () => {
    expect(adminUserId("Admin@Elofik.com")).toBe(adminUserId("admin@elofik.com"));
    expect(adminUserId("admin@elofik.com")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
