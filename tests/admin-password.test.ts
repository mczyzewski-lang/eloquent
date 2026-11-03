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
  it("odrzuca uszkodzony skrót", () => {
    expect(verifyPasswordHash("x", "plaintext")).toBe(false);
    expect(verifyPasswordHash("x", "scrypt$1$1$1$a$b")).toBe(false);
  });
  it("stabilny identyfikator konta admina", () => {
    expect(adminUserId("Admin@Elofik.com")).toBe(adminUserId("admin@elofik.com"));
    expect(adminUserId("admin@elofik.com")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
