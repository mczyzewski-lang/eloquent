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
});
