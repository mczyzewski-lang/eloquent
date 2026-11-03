import { z } from "zod";
import { error, adminHandleError, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import { getDb, nowIso } from "@/lib/db";
import { generateStoryDraft } from "@/lib/ai/story-generator";
import { buildRenderPlan, validateStory, type StoryVersion } from "@/lib/domain/story";
import { addressForm, getNameForms } from "@/lib/domain/names";
import { currentVoiceProfile } from "@/lib/audio/tts";
import { assemblePlan, generateCore, signedAudioUrl } from "@/lib/services/audio-pipeline";
import { getStoryVersion } from "@/lib/services/stories";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

const segment = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,30}$/),
  order: z.number().int(),
  type: z.enum(["CORE", "PERSONALIZED_CHILD", "PERSONALIZED_FAMILY", "OPTIONAL", "EDUCATIONAL"]),
  text: z.string().min(1).max(4000),
  fallbackText: z.string().max(2000).nullable().optional(),
  pauseAfterMs: z.number().int().min(0).max(5000).optional(),
});

const storySchema = z.object({
  storyId: z.string().regex(/^[a-z0-9-]{3,80}$/),
  dayNumber: z.number().int().min(1).max(365),
  title: z.string().min(3).max(120),
  wordOfDay: z.string().min(2).max(40),
  wordDefinition: z.string().max(400),
  educationalGoal: z.string().max(400),
  summary: z.string().max(600),
  ending: z.string().max(400),
  parentQuestion: z.string().max(300),
  illustrationPrompt: z.string().max(800),
  segments: z.array(segment).min(1).max(40),
}).passthrough();

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), dayNumber: z.number().int(), word: z.string(), theme: z.string().optional(), interests: z.array(z.string()).optional(), reviewWords: z.array(z.string()).optional() }),
  z.object({ action: z.literal("save"), story: storySchema }),
  z.object({ action: z.literal("approve"), storyId: z.string(), force: z.boolean().optional() }),
  z.object({ action: z.literal("generate_core"), storyId: z.string() }),
  z.object({ action: z.literal("publish"), storyId: z.string(), scheduledFor: z.string().nullable().optional() }),
  z.object({ action: z.literal("archive"), storyId: z.string() }),
  z.object({ action: z.literal("preview"), storyId: z.string(), childName: z.string().max(30), family: z.record(z.string(), z.string().max(30)).optional(), audio: z.boolean().optional() }),
]);

async function saveVersion(story: StoryVersion, actor: string, status: StoryVersion["status"] = "draft") {
  const db = getDb();
  const existing = await db.findOne("stories", { id: story.storyId });
  const version = existing ? existing.current_version + 1 : 1;
  const data = { ...story, version, status };
  if (existing) await db.update("stories", { id: story.storyId }, { current_version: version, status, day_number: story.dayNumber, updated_at: nowIso() });
  else await db.insert("stories", { id: story.storyId, day_number: story.dayNumber, locale: story.locale ?? "pl", current_version: version, status, scheduled_for: null, created_at: nowIso(), updated_at: nowIso() });
  await db.insert("story_versions", { story_id: story.storyId, version, data, reviewed_by: null, reviewed_at: null, created_at: nowIso() });
  void actor;
  return data;
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await getSessionUser();
    if (!user?.isAdmin) return error("Brak uprawnień", 403);
    const b = body.parse(await readJson(req, 200_000));
    await ensureRuntimeSettings();
    const db = getDb();

    switch (b.action) {
      case "generate": {
        const draft = await generateStoryDraft(b);
        const saved = await saveVersion(draft.story, user.id);
        await auditLog(user, "story.generate", saved.storyId, { provider: draft.provider });
        return json({ story: saved, issues: draft.issues, provider: draft.provider });
      }
      case "save": {
        const story = b.story as unknown as StoryVersion;
        const saved = await saveVersion({ ...story, locale: story.locale ?? "pl" }, user.id, "in_review");
        await auditLog(user, "story.save", saved.storyId, { version: saved.version });
        return json({ story: saved, issues: validateStory(saved) });
      }
      case "approve": {
        const story = await getStoryVersion(b.storyId);
        if (!story) return error("Nie znaleziono", 404);
        const issues = validateStory(story);
        if (issues.length && !b.force) return error("Bajka nie spełnia reguł redakcyjnych", 422, { issues });
        await db.update("stories", { id: b.storyId }, { status: "approved", updated_at: nowIso() });
        await db.update("story_versions", { story_id: b.storyId, version: story.version }, { reviewed_by: user.email, reviewed_at: nowIso() });
        await auditLog(user, "story.approve", b.storyId, { forced: Boolean(b.force && issues.length), issues });
        return json({ ok: true });
      }
      case "generate_core": {
        const story = await getStoryVersion(b.storyId);
        if (!story) return error("Nie znaleziono", 404);
        const row = await db.findOne("stories", { id: b.storyId });
        if (!row || !["approved", "core_generated", "published"].includes(row.status)) return error("Najpierw zatwierdź scenariusz", 422);
        const res = await generateCore(story);
        if (row.status === "approved") await db.update("stories", { id: b.storyId }, { status: "core_generated", updated_at: nowIso() });
        await auditLog(user, "story.generate_core", b.storyId, res);
        return json(res);
      }
      case "publish": {
        const row = await db.findOne("stories", { id: b.storyId });
        if (!row) return error("Nie znaleziono", 404);
        if (!["approved", "core_generated", "published"].includes(row.status)) return error("Bajka musi zostać zatwierdzona przed publikacją", 422);
        // jeden opublikowany dzień na język
        for (const other of await db.find("stories", { day_number: row.day_number, locale: row.locale, status: "published" })) {
          if (other.id !== row.id) await db.update("stories", { id: other.id }, { status: "archived", updated_at: nowIso() });
        }
        await db.update("stories", { id: b.storyId }, { status: "published", scheduled_for: b.scheduledFor ?? null, updated_at: nowIso() });
        await auditLog(user, "story.publish", b.storyId, { scheduledFor: b.scheduledFor ?? null });
        return json({ ok: true });
      }
      case "archive": {
        await db.update("stories", { id: b.storyId }, { status: "archived", updated_at: nowIso() });
        await auditLog(user, "story.archive", b.storyId);
        return json({ ok: true });
      }
      case "preview": {
        const story = await getStoryVersion(b.storyId);
        if (!story) return error("Nie znaleziono", 404);
        const forms = getNameForms(b.childName || "Leon");
        const ctx = { child: { name: forms.nominative, address: addressForm(forms), gender: forms.gender }, family: b.family ?? {} };
        const plan = buildRenderPlan(story, ctx, currentVoiceProfile());
        let audioUrl: string | null = null;
        if (b.audio) {
          const res = await assemblePlan(plan, { purposeShared: "core", purposePersonal: "preview" });
          audioUrl = await signedAudioUrl(res.assembly.storage_path);
        }
        return json({ plan, audioUrl, issues: validateStory(story) });
      }
    }
  } catch (e) {
    return adminHandleError(e, "stories");
  }
}
