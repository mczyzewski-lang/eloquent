import { beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "./helpers";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/settings/crypto";
import { describeSettings, ensureRuntimeSettings, saveSetting, validateSetting } from "@/lib/settings/runtime";
import { config, hasElevenLabs, hasOpenAI } from "@/lib/config";
import { getTts } from "@/lib/audio/tts";
import type { MemoryDb } from "@/lib/db/memory";

let db: MemoryDb;
beforeEach(async () => {
  db = freshEnv().db;
  await ensureRuntimeSettings(true);
});

const EL_KEY = "sk_0123456789abcdef0123456789abcdef";
const OA_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz0123";

describe("Klucze API z panelu admina", () => {
  it("szyfrowanie AES-GCM: odszyfrowanie tylko właściwym sekretem", () => {
    const enc = encryptSecret(EL_KEY, "secret-a-secret-a-secret-a-secret-a");
    expect(enc).not.toContain(EL_KEY);
    expect(decryptSecret(enc, "secret-a-secret-a-secret-a-secret-a")).toBe(EL_KEY);
    expect(decryptSecret(enc, "inny-sekret-inny-sekret-inny-sekret")).toBeNull();
    expect(maskSecret(EL_KEY)).toBe("sk_…cdef");
  });

  it("zapis w panelu włącza integracje od razu; w bazie tylko szyfrogram", async () => {
    expect(hasElevenLabs()).toBe(false);
    await saveSetting("elevenlabs_api_key", EL_KEY, "admin@x.pl");
    await saveSetting("elevenlabs_voice_id", "21m00Tcm4TlvDq8ikWAM", "admin@x.pl");
    await saveSetting("openai_api_key", OA_KEY, "admin@x.pl");
    await saveSetting("ai_monthly_budget_usd", "20", "admin@x.pl");
    expect(hasElevenLabs()).toBe(true);
    expect(hasOpenAI()).toBe(true);
    expect(config.elevenlabs.apiKey).toBe(EL_KEY);
    expect(config.budget.monthlyUsd).toBe(20);
    expect(JSON.stringify(await db.find("app_settings"))).not.toContain(EL_KEY);

    const view = await describeSettings();
    const el = view.find((v) => v.key === "elevenlabs_api_key")!;
    expect(el.source).toBe("panel");
    expect(el.display).toBe("sk_…cdef");
    expect(JSON.stringify(view)).not.toContain(EL_KEY);
    expect(JSON.stringify(view)).not.toContain(OA_KEY);

    await saveSetting("elevenlabs_api_key", "", "admin@x.pl");
    expect(hasElevenLabs()).toBe(false);
  });

  it("walidacja formatu", () => {
    expect(validateSetting("openai_api_key", "abc")).not.toBeNull();
    expect(validateSetting("elevenlabs_api_key", "0123456789abcdef0123456789abcdef")).toMatch(/sk_/); // Key ID zamiast klucza
    expect(validateSetting("elevenlabs_api_key", "sk_0123456789abcdef0123456789abcdef")).toBeNull();
    expect(validateSetting("openai_api_key", OA_KEY)).toBeNull();
    expect(validateSetting("ai_monthly_budget_usd", "-5")).not.toBeNull();
    expect(validateSetting("elevenlabs_voice_id", "zły id!")).not.toBeNull();
  });

  it("w testach TTS pozostaje mockiem", () => {
    expect(getTts().name).toBe("mock");
  });
});

describe("Trwałość danych na Railway", () => {
  it("z wolumenem dane trafiają na wolumen", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    const prev = { ...process.env };
    delete process.env.ELOFIK_DATA_DIR;
    process.env.RAILWAY_VOLUME_MOUNT_PATH = "/data";
    const mod = await import("@/lib/config");
    expect(mod.config.dataDir).toBe("/data/elofik");
    expect(mod.dataStorageInfo().kind).toBe("volume");
    process.env = prev;
    vi.resetModules();
  });
});
