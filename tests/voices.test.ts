import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "./helpers";
import { ensureRuntimeSettings, saveSetting } from "@/lib/settings/runtime";
import { chooseLeadingVoice, designVoices, saveDesignedVoice, VoiceStudioError } from "@/lib/services/voices";
import { config } from "@/lib/config";
import type { MemoryDb } from "@/lib/db/memory";

let db: MemoryDb;
const requests: { url: string; body: Record<string, unknown> | null }[] = [];

beforeEach(async () => {
  db = freshEnv().db;
  requests.length = 0;
  await ensureRuntimeSettings(true);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.endsWith("/v1/text-to-voice/design")) {
      return new Response(JSON.stringify({ previews: [1, 2, 3].map((i) => ({ generated_voice_id: `gen${i}`, audio_base_64: Buffer.from(`mp3-${i}`).toString("base64"), media_type: "audio/mpeg" })) }));
    }
    if (url.endsWith("/v1/text-to-voice")) return new Response(JSON.stringify({ voice_id: "Abc123Def456Ghi789Jk" }));
    if (url.endsWith("/v1/models"))
      return new Response(JSON.stringify([
        { model_id: "eleven_multilingual_v2", can_do_text_to_speech: true, languages: [{ language_id: "pl" }] },
        { model_id: "eleven_v3", can_do_text_to_speech: true, languages: [{ language_id: "pl" }] },
        { model_id: "eleven_v4", can_do_text_to_speech: true, languages: [{ language_id: "pl" }] },
        { model_id: "eleven_english_sts_v2", can_do_text_to_speech: false, languages: [{ language_id: "en" }] },
      ]));
    if (url.includes("/v1/text-to-speech/")) return new Response(Buffer.from("mp3"));
    return new Response("not found", { status: 404 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Studio głosu Elofika", () => {
  it("bez klucza ElevenLabs nic nie wysyła", async () => {
    await expect(designVoices({ name: "Test", description: "A warm Polish storyteller voice for kids" })).rejects.toBeInstanceOf(VoiceStudioError);
    expect(requests).toHaveLength(0);
  });

  it("projektuje 3 kandydatów z demo, zapisuje wybrany i ustawia go jako wiodący", async () => {
    await saveSetting("elevenlabs_api_key", "sk_0123456789abcdef0123456789abcdef", "a@x.pl");
    await saveSetting("ai_monthly_budget_usd", "5", "a@x.pl");
    const rows = await designVoices({ name: "Ciepły opowiadacz", description: "A warm, gentle young male storyteller voice speaking Polish" });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.preview_path?.startsWith("voices/previews/"))).toBe(true);
    const designReq = requests.find((r) => r.url.endsWith("/design"))!;
    expect(String(designReq.body?.text)).toContain("Elofik");
    expect(String(designReq.body?.text).length).toBeGreaterThanOrEqual(100);

    const saved = await saveDesignedVoice(rows[1].id);
    expect(saved.voice_id).toBe("Abc123Def456Ghi789Jk");
    const res = await chooseLeadingVoice(saved.voice_id!, "a@x.pl");
    expect(config.elevenlabs.voiceId).toBe("Abc123Def456Ghi789Jk");
    expect(config.elevenlabs.voiceVersion).toBe(res.version);
    expect(res.version).toBe("VOICE_ABC123DE");
    expect(await db.count("ai_cost_logs", { purpose: "preview" })).toBe(1);
  });

  it("to samo demo w każdym modelu TTS z polskim (v2 / v3 / v4) i wybór głosu razem z modelem", async () => {
    await saveSetting("elevenlabs_api_key", "sk_0123456789abcdef0123456789abcdef", "a@x.pl");
    await saveSetting("ai_monthly_budget_usd", "5", "a@x.pl");
    const { listTtsModels, renderModelDemos } = await import("@/lib/services/voices");
    const models = await listTtsModels();
    expect(models.map((m) => m.id)).toEqual(["eleven_multilingual_v2", "eleven_v3", "eleven_v4"]);
    const [cand] = await designVoices({ name: "Wesoły elf", description: "A bright cheerful youthful elf voice speaking Polish", model: "eleven_ttv_v3" });
    const row = await renderModelDemos(cand.id, models.map((m) => m.id));
    expect(row.voice_id).toBeTruthy();
    expect(row.model_demos?.map((d) => d.model)).toEqual(["eleven_multilingual_v2", "eleven_v3", "eleven_v4"]);
    expect(row.model_demos?.every((d) => d.path && !d.error)).toBe(true);
    const ttsBodies = requests.filter((r) => r.url.includes("/v1/text-to-speech/")).map((r) => r.body!);
    expect(ttsBodies.map((b) => b.model_id)).toEqual(["eleven_multilingual_v2", "eleven_v3", "eleven_v4"]);
    expect((ttsBodies[1].voice_settings as Record<string, unknown>).stability).toBe(0.5);
    // ponowne porównanie nie płaci drugi raz
    await renderModelDemos(cand.id, models.map((m) => m.id));
    expect(requests.filter((r) => r.url.includes("/v1/text-to-speech/"))).toHaveLength(3);
    const chosen = await chooseLeadingVoice(row.voice_id!, "a@x.pl", "eleven_v3");
    expect(config.elevenlabs.ttsModel).toBe("eleven_v3");
    expect(chosen.version).toBe("VOICE_ABC123DE_V3");
  });
});
