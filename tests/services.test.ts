import { beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "./helpers";
import { STORY_CATALOG } from "@/content/stories";
import { SAMPLE_STORY } from "@/content/sample";
import { buildRenderPlan } from "@/lib/domain/story";
import { currentVoiceProfile } from "@/lib/audio/tts";
import { renderStoryForFamily, assemblePlan } from "@/lib/services/audio-pipeline";
import { addressForm, getNameForms } from "@/lib/domain/names";
import { createOrUpdateFamily, buildTemplateContext, getFamilyBundle } from "@/lib/services/families";
import { ensureGreetingAudio, prepareGreetingForStory } from "@/lib/services/greetings";
import { pickGreeting } from "@/lib/domain/greetings";
import { finishVoiceSession, recordSkip, startVoiceSession } from "@/lib/services/voice";
import { AccessDeniedError, assertStoryAccessible, getAccess } from "@/lib/services/access";
import { createGiftPurchase, markGiftPaid, activationTokenFor, redeemGift, GiftRedeemError, createFreeGiftStory, getFreeGiftStory } from "@/lib/services/gifts";
import { simulateSubscription } from "@/lib/services/billing";
import { recordPlayback } from "@/lib/services/progress";
import { costMetrics } from "@/lib/services/metrics";
import type { MemoryDb } from "@/lib/db/memory";
import type { MockTts } from "@/lib/audio/tts";

const ctxFor = (name: string, family: Record<string, string> = {}) => {
  const f = getNameForms(name);
  return { child: { name: f.nominative, address: addressForm(f), gender: f.gender }, family };
};

let env: { db: MemoryDb; tts: MockTts };
beforeEach(() => {
  env = freshEnv() as never;
});

async function makeFamily(email: string, child = "Leon", members = [{ relation: "mom" as const, name: "Monika" }, { relation: "grandma" as const, name: "Basia" }]) {
  const user = await env.db.insert("users", { email, is_admin: false, created_at: new Date().toISOString() });
  const family = await createOrUpdateFamily(user.id, { child: { name: child, age: 5, addressStyle: "diminutive" }, members, interests: ["kosmos"], locale: "pl" } as never);
  return { user, family };
}

describe("Próbka z landing page (scenariusz 1)", () => {
  it("generuje personalizację z imieniem i wspólny CORE", async () => {
    const plan = buildRenderPlan(SAMPLE_STORY, ctxFor("Leon"), currentVoiceProfile());
    expect(plan.segments[0].text).toContain("Leonku");
    const res = await assemblePlan(plan, { purposeShared: "sample", purposePersonal: "sample" });
    expect(res.generatedSegments).toBe(2);
    expect(res.assembly.duration_ms).toBeGreaterThan(15_000);
  });
});

describe("Cache audio (scenariusze 2, 3, 4, 17)", () => {
  it("ponowne odtworzenie tej samej bajki nie wywołuje TTS", async () => {
    const story = STORY_CATALOG[0];
    await renderStoryForFamily(story, ctxFor("Leon", { mom: "Monika" }), "fam-1");
    const calls = env.tts.calls;
    const again = await renderStoryForFamily(story, ctxFor("Leon", { mom: "Monika" }), "fam-1");
    expect(env.tts.calls).toBe(calls);
    expect(again.generatedSegments).toBe(0);
  });

  it("druga rodzina (Zosia) generuje tylko segmenty personalizowane — CORE wspólny", async () => {
    const story = STORY_CATALOG[0];
    const leon = await renderStoryForFamily(story, ctxFor("Leon", { mom: "Monika" }), "fam-1");
    const before = env.tts.calls;
    const zosia = await renderStoryForFamily(story, ctxFor("Zosia", { mom: "Ewa" }), "fam-2");
    const personal = zosia.plan.segments.filter((s) => !s.shared).length;
    expect(env.tts.calls - before).toBe(personal);
    const sharedA = leon.plan.segments.filter((s) => s.shared).map((s) => s.cacheKey);
    const sharedB = zosia.plan.segments.filter((s) => s.shared).map((s) => s.cacheKey);
    expect(sharedA).toEqual(sharedB);
  });

  it("zmiana imienia babci generuje tylko wymagany fragment", async () => {
    const story = STORY_CATALOG[0];
    await renderStoryForFamily(story, ctxFor("Leon", { grandma: "Basia" }), "fam-1");
    const before = env.tts.calls;
    const res = await renderStoryForFamily(story, ctxFor("Leon", { grandma: "Halina" }), "fam-1");
    expect(env.tts.calls - before).toBe(1);
    expect(res.generatedSegments).toBe(1);
  });

  it("100 rodzin słuchających tej samej bajki korzysta z jednego CORE", async () => {
    const story = STORY_CATALOG[0];
    const coreCount = buildRenderPlan(story, null, currentVoiceProfile()).segments.filter((s) => s.shared).length;
    for (let i = 0; i < 100; i++) await renderStoryForFamily(story, ctxFor(i % 2 ? "Leon" : "Zosia"), `fam-${i}`);
    const shared = await env.db.count("audio_cache", { shared: true });
    expect(shared).toBeLessThanOrEqual(coreCount + 2);
    // 2 imiona × segmenty dziecięce, reszta z cache
    expect(env.tts.calls).toBeLessThan(coreCount + 10);
  });
});

describe("Rytuał „Hej Elofik!” (scenariusze 5, 6, 7, 10)", () => {
  it("pierwsze powitanie, potem wariant powrotu; powtórne użycie bez nowego TTS", async () => {
    const { family } = await makeFamily("leon@x.pl");
    const bundle = (await getFamilyBundle(family.id))!;
    const ctx = buildTemplateContext(bundle)!;
    const first = await prepareGreetingForStory(family.id, ctx, "pl", 1);
    expect(first.kind).toBe("FIRST_MEETING");
    expect(first.text).toContain("Leonku");

    const s = await startVoiceSession(family.id, STORY_CATALOG[0].storyId, "pl");
    expect(s.mode).toBe("simulated");
    await finishVoiceSession(family.id, s.sessionId, "recognized", 2000, 1);
    await recordPlayback(family.id, STORY_CATALOG[0].storyId, { positionSec: 10, durationSec: 300, event: "start" });
    // „następny dzień”
    await env.db.update("listening_progress", { family_id: family.id }, { last_played_at: new Date(Date.now() - 24 * 3600_000).toISOString() });
    const second = await prepareGreetingForStory(family.id, ctx, "pl", 2);
    expect(second.kind).toBe("RETURNING_NEXT_DAY");

    const calls = env.tts.calls;
    const again = await ensureGreetingAudio(ctx, pickGreeting({ totalGreetings: 1, lastListenedAt: new Date(Date.now() - 86_400_000), now: new Date(), storyDay: 2 }, "pl"), family.id);
    expect(again.variantId).toBe(second.variantId);
    expect(env.tts.calls).toBe(calls);
    expect(again.assetLabel).toMatch(/^LEON \+ RETURNING_GREETING_\d+ \+ VOICE_V1$/);
  });

  it("sesja głosowa nie zapisuje transkrypcji i ma limit prób", async () => {
    const { family } = await makeFamily("a@x.pl");
    const storyId = STORY_CATALOG[0].storyId;
    for (let i = 0; i < 4; i++) {
      const s = await startVoiceSession(family.id, storyId, "pl");
      await finishVoiceSession(family.id, s.sessionId, "failed", 3000, 0.1);
    }
    await expect(startVoiceSession(family.id, storyId, "pl")).rejects.toThrow("attempts_limit");
    const rows = await env.db.find("voice_greeting_sessions", { family_id: family.id });
    for (const r of rows) expect(Object.keys(r)).not.toContain("transcript");
    // pominięcie rytuału zawsze możliwe
    await expect(recordSkip(family.id, storyId)).resolves.toBeTruthy();
  });
});

describe("Dostęp i izolacja rodzin (scenariusze 9, 12, 19)", () => {
  it("bez abonamentu dostępny tylko Dzień 1; po płatności kolejne dni wg kalendarza", async () => {
    const { family } = await makeFamily("p@x.pl");
    await env.db.update("families", { id: family.id }, { activated_at: new Date(Date.now() - 3 * 86_400_000 - 3600_000).toISOString() });
    const fam = (await env.db.findOne("families", { id: family.id }))!;
    await expect(assertStoryAccessible(fam, STORY_CATALOG[0].storyId)).resolves.toBeTruthy();
    await expect(assertStoryAccessible(fam, STORY_CATALOG[1].storyId)).rejects.toBeInstanceOf(AccessDeniedError);
    await simulateSubscription(family.id);
    expect((await getAccess(family.id)).hasAccess).toBe(true);
    await expect(assertStoryAccessible(fam, STORY_CATALOG[2].storyId)).resolves.toBeTruthy();
    await expect(assertStoryAccessible(fam, STORY_CATALOG[6].storyId)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("rodzina nie może zakończyć cudzej sesji głosowej", async () => {
    const a = await makeFamily("a@x.pl");
    const b = await makeFamily("b@x.pl", "Zosia");
    const s = await startVoiceSession(a.family.id, STORY_CATALOG[0].storyId, "pl");
    expect(await finishVoiceSession(b.family.id, s.sessionId, "recognized", 1000, 1)).toBeNull();
  });
});

describe("Prezenty (scenariusze 13, 14, 15, 16)", () => {
  it("darmowa niespodzianka ma bezpieczny link", async () => {
    const res = await createFreeGiftStory({ childName: "Leon", childAge: 5, giverRelation: "grandma", giverName: "Basia", interests: [] });
    expect(res.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    const g = await getFreeGiftStory(res.token);
    expect(g?.giver).toBe("babcia Basia");
    expect(await getFreeGiftStory("x".repeat(32))).toBeNull();
    // w bazie wyłącznie hash
    expect(JSON.stringify(await env.db.find("gift_stories"))).not.toContain(res.token);
  });

  it("zakup → aktywacja jednorazowa → brak auto-odnowienia", async () => {
    const gift = await createGiftPurchase({ childName: "Leon", childAge: 5, giverName: "Basia", giverRelation: "grandma", members: [], interests: [], buyerEmail: "babcia@x.pl", parentEmail: null });
    await markGiftPaid(gift.id, "cs_test", 3990);
    await markGiftPaid(gift.id, "cs_test", 3990); // webhook powtórzony — idempotentnie
    expect(await env.db.count("payments", { kind: "gift" })).toBe(1);
    const token = activationTokenFor(gift.id);
    const parent = await env.db.insert("users", { email: "rodzic@x.pl", is_admin: false, created_at: new Date().toISOString() });
    const { family } = await redeemGift(token, parent.id);
    const access = await getAccess(family.id);
    expect(access.hasAccess).toBe(true);
    expect(access.autoRenews).toBe(false);
    await expect(redeemGift(token, parent.id)).rejects.toBeInstanceOf(GiftRedeemError);
    const bundle = await getFamilyBundle(family.id);
    expect(bundle?.members.some((m) => m.relation === "grandma" && m.name === "Basia")).toBe(true);
    // po miesiącu dostęp wygasa bez obciążenia
    const later = new Date(Date.now() + 32 * 86_400_000);
    expect((await getAccess(family.id, later)).hasAccess).toBe(false);
    expect(await env.db.count("subscriptions", { family_id: family.id, source: "stripe" })).toBe(0);
  });
});

describe("Koszty (scenariusz 18)", () => {
  it("panel rozdziela TTS, STT i ilustracje", async () => {
    const { family } = await makeFamily("c@x.pl");
    await renderStoryForFamily(STORY_CATALOG[0], ctxFor("Leon"), family.id);
    const s = await startVoiceSession(family.id, STORY_CATALOG[0].storyId, "pl");
    await env.db.update("voice_greeting_sessions", { id: s.sessionId }, { started_at: new Date(Date.now() - 3000).toISOString() });
    await finishVoiceSession(family.id, s.sessionId, "recognized", 2500, 1);
    const m = await costMetrics();
    expect(m.byProvider).toHaveProperty("elevenlabsTts");
    expect(m.byProvider).toHaveProperty("elevenlabsStt");
    expect(m.byProvider).toHaveProperty("openaiImage");
    expect(m.listPrice.ttsCharsMonth).toBeGreaterThan(1000);
    expect(m.listPrice.sttSecondsMonth).toBeGreaterThan(0);
  });
});

describe("FFmpeg", () => {
  it("składa segmenty z normalizacją głośności do MP3", async () => {
    const { hasFfmpeg, assembleSegments } = await import("@/lib/audio/ffmpeg");
    const prev = process.env.ELOFIK_DISABLE_FFMPEG;
    process.env.ELOFIK_DISABLE_FFMPEG = "0";
    try {
      if (!(await hasFfmpeg())) return;
      const { mockSpeechWav } = await import("@/lib/audio/wav");
      const out = await assembleSegments([
        { audio: mockSpeechWav("Hej Leonku tu Elofik").wav, ext: "wav", pauseAfterMs: 400 },
        { audio: mockSpeechWav("Dzisiaj poznamy nowe słowo").wav, ext: "wav", pauseAfterMs: 0 },
      ]);
      expect(out.ext).toBe("mp3");
      expect(out.durationMs).toBeGreaterThan(2000);
      expect(out.segmentDurationsMs).toHaveLength(2);
    } finally {
      process.env.ELOFIK_DISABLE_FFMPEG = prev;
    }
  });
});
