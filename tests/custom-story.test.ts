import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "./helpers";
import { createOrUpdateFamily } from "@/lib/services/families";
import { simulateSubscription } from "@/lib/services/billing";
import { createCustomStory, customStoryQuota, CUSTOM_STORIES_PER_MONTH } from "@/lib/services/custom-stories";
import { assertStoryAccessible } from "@/lib/services/access";
import { buildRenderPlan } from "@/lib/domain/story";
import { currentVoiceProfile } from "@/lib/audio/tts";
import { ensureRuntimeSettings, saveSetting } from "@/lib/settings/runtime";
import type { MemoryDb } from "@/lib/db/memory";

let db: MemoryDb;
beforeEach(async () => {
  db = freshEnv().db;
  await ensureRuntimeSettings(true);
});
afterEach(() => vi.unstubAllGlobals());

async function family(premium = true) {
  const u = await db.insert("users", { email: `p${Math.random()}@x.pl`, is_admin: false, created_at: new Date().toISOString() });
  const f = await createOrUpdateFamily(u.id, { child: { name: "Leon", age: 5, addressStyle: "diminutive" }, members: [{ relation: "mom", name: "Monika" }, { relation: "dog", name: "Burek" }], interests: [], locale: "pl" } as never);
  if (premium) await simulateSubscription(f.id);
  return f;
}

describe("Własna bajka z AI", () => {
  it("tylko Premium; limit miesięczny; bajka tylko dla własnej rodziny", async () => {
    const free = await family(false);
    await expect(createCustomStory(free, null, 5, { idea: "Wyprawa na Księżyc w kartonowej rakiecie", length: "short", relations: [] })).rejects.toThrow(/Premium/);
    const f = await family();
    const row = await createCustomStory(f, null, 5, { idea: "Wyprawa na Księżyc w kartonowej rakiecie", word: "odwaga", length: "short", relations: ["mom", "dog"] });
    expect(row.story_id).toMatch(/^wlasna-[a-z0-9]{8}$/);
    const { story } = await assertStoryAccessible(f, row.story_id);
    const plan = buildRenderPlan(story, { child: { name: "Leon", address: "Leonku", gender: "m" }, family: { mom: "Monika", dog: "Burek" } }, currentVoiceProfile());
    const text = plan.segments.map((s) => s.text).join(" ");
    expect(text).toContain("Leonku");
    expect(text).not.toMatch(/\{|\}/);
    const other = await family();
    await expect(assertStoryAccessible(other, row.story_id)).rejects.toThrow();
    for (let i = 1; i < CUSTOM_STORIES_PER_MONTH; i++) await createCustomStory(f, null, 5, { idea: `Przygoda numer ${i} w zaczarowanym lesie`, length: "short", relations: [] });
    expect((await customStoryQuota(f.id)).left).toBe(0);
    await expect(createCustomStory(f, null, 5, { idea: "Jeszcze jedna przygoda w ogrodzie", length: "short", relations: [] })).rejects.toThrow(/wykorzystano/);
  });

  it("odrzuca tematy nieodpowiednie dla małych dzieci (bez fałszywych alarmów)", async () => {
    const f = await family();
    await expect(createCustomStory(f, null, 5, { idea: "Bajka o wojnie i karabinach", length: "short", relations: [] })).rejects.toThrow(/nie pasuje/);
    // „zabiera”, „serce bije” — zwykłe słowa, nie blokujemy
    await expect(createCustomStory(f, null, 5, { idea: "Elofik zabiera nas do ogrodu, gdzie serce bije szybciej z radości", length: "short", relations: [] })).resolves.toBeTruthy();
  });

  it("do OpenAI nie trafiają imiona — tylko pomysł i zmienne relacji", async () => {
    await saveSetting("openai_api_key", "sk-test0123456789abcdefghijklmnop", "a@x.pl");
    await saveSetting("ai_monthly_budget_usd", "5", "a@x.pl");
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url instanceof Request ? url.url : url);
      const body = init?.body ? String(init.body) : "";
      sent.push(body);
      if (u.includes("/moderations")) return new Response(JSON.stringify({ id: "m", model: "omni", results: [{ flagged: false, categories: {}, category_scores: {} }] }), { headers: { "content-type": "application/json" } });
      const content = JSON.stringify({ title: "Elofik i rakieta z kartonu", word: "odwaga", wordDefinition: "Odwaga to robienie czegoś mimo lekkiego strachu.", parentQuestion: "Kiedy byłeś odważny?", summary: "Lot na Księżyc.", segments: [
        { type: "CORE", text: "Elofik zbudował rakietę z wielkiego kartonu po lodówce." },
        { type: "PERSONALIZED_CHILD", text: "— {child}, lecisz ze mną? — zapytał Elofik. {g:Gotowy|Gotowa|Gotowi}?" },
        { type: "PERSONALIZED_FAMILY", text: "Mama {mom} pomachała im z ogrodu, a pies {dog} szczeknął radośnie." },
        { type: "EDUCATIONAL", text: "Odwaga to robienie czegoś, mimo że trochę się boimy. Odwaga rośnie, gdy ktoś jest obok." },
        { type: "CORE", text: "Rakieta wylądowała miękko na Księżycu, a odwaga świeciła jak gwiazda. {nieznana} Koniec." },
      ] });
      return new Response(JSON.stringify({ id: "c", object: "chat.completion", created: 1, model: "x", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }], usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 } }), { headers: { "content-type": "application/json" } });
    });
    const f = await family();
    const row = await createCustomStory(f, null, 5, { idea: "Lot na Księżyc w kartonowej rakiecie", length: "short", relations: ["mom", "dog"] });
    const all = sent.join(" ");
    expect(all).not.toContain("Leon");
    expect(all).not.toContain("Monika");
    expect(all).not.toContain("Burek");
    expect(all).toContain("mama {mom}");
    const story = row.story as { segments: { text: string; type: string }[] };
    expect(story.segments.some((s) => s.text.includes("{nieznana}"))).toBe(false);
    expect(story.segments.find((s) => s.text.includes("{mom}"))?.type).toBe("PERSONALIZED_FAMILY");
  });
});
