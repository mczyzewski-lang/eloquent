import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "./helpers";
import { formatPhone, maskPhone, normalizePhone } from "@/lib/domain/phone";
import { OTP_MAX_ATTEMPTS, PhoneAuthError, startPhoneLogin, verifyPhoneCode } from "@/lib/services/phone-auth";
import { ensureRuntimeSettings, saveSetting } from "@/lib/settings/runtime";
import type { MemoryDb } from "@/lib/db/memory";

describe("Numer telefonu", () => {
  it("normalizuje polskie numery do E.164", () => {
    expect(normalizePhone("600 123 456")).toBe("+48600123456");
    expect(normalizePhone("+48 600-123-456")).toBe("+48600123456");
    expect(normalizePhone("0048600123456")).toBe("+48600123456");
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
  });
  it("odrzuca błędne numery", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+48 100 123 456")).toBeNull(); // nie komórkowy
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("formatuje i maskuje", () => {
    expect(formatPhone("+48600123456")).toBe("+48 600 123 456");
    expect(maskPhone("+48600123456")).toBe("+48 *** *** 456");
  });
});

describe("Logowanie kodem SMS", () => {
  let db: MemoryDb;
  const sent: { url: string; body: string }[] = [];
  beforeEach(async () => {
    db = freshEnv().db;
    sent.length = 0;
    await ensureRuntimeSettings(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("bez bramki SMS: kod testowy, w bazie tylko HMAC", async () => {
    const r = await startPhoneLogin("+48600123456", "1.1.1.1");
    expect(r.sent).toBe(false);
    expect(r.testCode).toMatch(/^\d{6}$/);
    const rows = await db.find("phone_otps", { phone: "+48600123456" });
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).not.toContain(r.testCode!);
    await verifyPhoneCode("+48600123456", r.testCode!, "1.1.1.1");
    // kod jest jednorazowy
    await expect(verifyPhoneCode("+48600123456", r.testCode!, "1.1.1.1")).rejects.toBeInstanceOf(PhoneAuthError);
  });

  it("z tokenem SMSAPI wysyła SMS i nie zwraca kodu", async () => {
    await saveSetting("smsapi_token", "abcdefghijklmnopqrstuvwxyz0123456789ABCD", "a@x.pl");
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      sent.push({ url, body: String(init?.body) });
      return new Response(JSON.stringify({ count: 1, list: [{ id: "1" }] }));
    });
    const r = await startPhoneLogin("+48600123457", "1.1.1.2");
    expect(r).toMatchObject({ sent: true });
    expect(r.testCode).toBeUndefined();
    expect(sent[0].url).toBe("https://api.smsapi.pl/sms.do");
    expect(sent[0].body).toContain("to=48600123457");
    expect(decodeURIComponent(sent[0].body.replace(/\+/g, " "))).toMatch(/Twój kod logowania to \d{6}/);
  });

  it("błędny kod: licznik prób i blokada po limicie", async () => {
    const r = await startPhoneLogin("+48600123458", "1.1.1.3");
    const wrong = r.testCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await expect(verifyPhoneCode("+48600123458", wrong, "1.1.1.3")).rejects.toThrow();
    // nawet poprawny kod po przekroczeniu limitu nie działa
    await expect(verifyPhoneCode("+48600123458", r.testCode!, "1.1.1.3")).rejects.toThrow(/Za dużo błędnych prób/);
  });

  it("ponowna wysyłka dopiero po odczekaniu, a nowy kod unieważnia stary", async () => {
    const first = await startPhoneLogin("+48600123459", "1.1.1.4");
    await expect(startPhoneLogin("+48600123459", "1.1.1.4")).rejects.toThrow(/już wysłany/);
    // symulacja upływu czasu: nowy kod po oknie ponownej wysyłki
    vi.useFakeTimers({ now: Date.now() + 60_000, toFake: ["Date"] });
    const second = await startPhoneLogin("+48600123459", "1.1.1.4");
    vi.useRealTimers();
    if (first.testCode !== second.testCode) await expect(verifyPhoneCode("+48600123459", first.testCode!, "1.1.1.4")).rejects.toThrow();
  });

  it("kod wygasa po 5 minutach", async () => {
    const r = await startPhoneLogin("+48600123460", "1.1.1.5");
    vi.useFakeTimers({ now: Date.now() + 6 * 60_000, toFake: ["Date"] });
    await expect(verifyPhoneCode("+48600123460", r.testCode!, "1.1.1.5")).rejects.toThrow(/wygasł/);
    vi.useRealTimers();
  });
});
