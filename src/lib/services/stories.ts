import { getDb, nowIso } from "@/lib/db";
import { isDemoMode } from "@/lib/config";
import { STORY_CATALOG } from "@/content/stories";
import type { StoryVersion } from "@/lib/domain/story";

let seeded = false;

/** Seed katalogu startowego (tryb demo automatycznie; produkcja — `npm run seed:demo` lub CMS). */
export async function ensureStoriesSeeded(force = false) {
  if (seeded && !force) return;
  if (!isDemoMode() && !force) {
    seeded = true;
    return;
  }
  const db = getDb();
  for (const s of STORY_CATALOG) {
    const exists = await db.findOne("stories", { id: s.storyId });
    if (exists) continue;
    await db.insert("stories", { id: s.storyId, day_number: s.dayNumber, locale: s.locale, current_version: s.version, status: s.status, scheduled_for: null, created_at: nowIso(), updated_at: nowIso() });
    await db.insert("story_versions", { story_id: s.storyId, version: s.version, data: s, reviewed_by: "seed", reviewed_at: nowIso(), created_at: nowIso() });
  }
  seeded = true;
}

export async function getStoryVersion(storyId: string, version?: number): Promise<StoryVersion | null> {
  await ensureStoriesSeeded();
  const db = getDb();
  const story = await db.findOne("stories", { id: storyId });
  if (!story) return null;
  const row = await db.findOne("story_versions", { story_id: storyId, version: version ?? story.current_version });
  return row ? { ...row.data, status: story.status } : null;
}

/** Opublikowane bajki w sekwencji dni (1..N bez dziur). */
export async function getPublishedSequence(locale = "pl"): Promise<StoryVersion[]> {
  await ensureStoriesSeeded();
  const db = getDb();
  const stories = await db.find("stories", { status: "published", locale }, { orderBy: { column: "day_number" } });
  const out: StoryVersion[] = [];
  let expected = 1;
  for (const s of stories) {
    if (s.day_number !== expected) break; // sekwencja nie może mieć luk
    const v = await db.findOne("story_versions", { story_id: s.id, version: s.current_version });
    if (!v) break;
    out.push({ ...v.data, status: s.status });
    expected++;
  }
  return out;
}

export async function getAllStoriesForAdmin() {
  await ensureStoriesSeeded();
  const db = getDb();
  const stories = await db.find("stories", {}, { orderBy: { column: "day_number" } });
  return Promise.all(
    stories.map(async (s) => ({ row: s, data: (await db.findOne("story_versions", { story_id: s.id, version: s.current_version }))?.data ?? null })),
  );
}
