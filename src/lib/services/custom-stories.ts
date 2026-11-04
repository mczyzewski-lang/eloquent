/**
 * Własne bajki rodziny (z pomysłu rodzica, napisane przez AI, czytane głosem Elofika).
 * Limit: CUSTOM_STORIES_PER_MONTH na rodzinę z aktywnym abonamentem (koszt: tekst AI + pełne TTS).
 */
import { randomUUID } from "node:crypto";
import { getDb, nowIso, type CustomStoryRow, type FamilyRow } from "@/lib/db";
import type { StoryVersion } from "@/lib/domain/story";
import { CustomStoryError, writeCustomStory, type CustomStoryRequest } from "@/lib/ai/custom-story";
import { getAccess } from "./access";
import { enqueueJob } from "./jobs";
import { track } from "./analytics";

export const CUSTOM_STORY_PREFIX = "wlasna-";
export const CUSTOM_STORIES_PER_MONTH = Number(process.env.CUSTOM_STORIES_PER_MONTH ?? 3);

export function isCustomStoryId(id: string) {
  return id.startsWith(CUSTOM_STORY_PREFIX);
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function customStoryQuota(familyId: string, now = new Date()) {
  const used = await getDb().count("custom_stories", { family_id: familyId, created_at: { gte: monthStart(now) } });
  return { used, limit: CUSTOM_STORIES_PER_MONTH, left: Math.max(0, CUSTOM_STORIES_PER_MONTH - used) };
}

export async function listCustomStories(familyId: string): Promise<CustomStoryRow[]> {
  return getDb().find("custom_stories", { family_id: familyId }, { orderBy: { column: "created_at", ascending: false }, limit: 50 });
}

export async function getCustomStory(familyId: string, storyId: string): Promise<StoryVersion | null> {
  const row = await getDb().findOne("custom_stories", { family_id: familyId, story_id: storyId });
  return row ? (row.story as unknown as StoryVersion) : null;
}

export async function createCustomStory(family: FamilyRow, childId: string | null, childAge: number, req: CustomStoryRequest): Promise<CustomStoryRow> {
  const access = await getAccess(family.id);
  if (!access.hasAccess) throw new CustomStoryError("Własne bajki są dostępne w Elofik Premium.");
  const quota = await customStoryQuota(family.id);
  if (quota.left <= 0) throw new CustomStoryError(`W tym miesiącu wykorzystano już ${quota.limit} własne bajki. Nowe będą dostępne od 1. dnia przyszłego miesiąca.`);
  const storyId = `${CUSTOM_STORY_PREFIX}${randomUUID().slice(0, 8)}`;
  const story = await writeCustomStory(req, { storyId, childAge });
  const row = await getDb().insert("custom_stories", {
    family_id: family.id,
    child_id: childId,
    story_id: storyId,
    idea: req.idea.slice(0, 400),
    title: story.title,
    word: story.wordOfDay,
    story: story as unknown as Record<string, unknown>,
    created_at: nowIso(),
  });
  await track("custom_story_created", { familyId: family.id, props: { length: req.length, relations: req.relations.length } });
  // nagranie w tle — zanim rodzic dotknie „Słuchaj”, większość bajki jest gotowa
  await enqueueJob("render_story", { familyId: family.id, storyId }, { dedupeKey: `story-${family.id}-${storyId}` });
  return row;
}

export async function deleteCustomStory(familyId: string, storyId: string) {
  return getDb().delete("custom_stories", { family_id: familyId, story_id: storyId });
}
