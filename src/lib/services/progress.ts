import { getDb, nowIso, type ListeningProgressRow } from "@/lib/db";

async function getOrCreate(familyId: string, storyId: string): Promise<ListeningProgressRow> {
  const db = getDb();
  const row = await db.findOne("listening_progress", { family_id: familyId, story_id: storyId });
  if (row) return row;
  return db.insert("listening_progress", {
    family_id: familyId,
    story_id: storyId,
    position_sec: 0,
    duration_sec: 0,
    completed: false,
    play_count: 0,
    favorite: false,
    word_discussed: false,
    first_played_at: null,
    last_played_at: null,
  });
}

export async function recordPlayback(familyId: string, storyId: string, update: { positionSec: number; durationSec: number; event: "start" | "progress" | "complete" }) {
  const db = getDb();
  const row = await getOrCreate(familyId, storyId);
  const now = nowIso();
  const patch: Partial<ListeningProgressRow> = {
    position_sec: Math.max(0, Math.min(update.positionSec, update.durationSec || update.positionSec)),
    duration_sec: update.durationSec || row.duration_sec,
    last_played_at: now,
  };
  if (update.event === "start") {
    patch.play_count = row.play_count + 1;
    patch.first_played_at = row.first_played_at ?? now;
  }
  if (update.event === "complete" || (update.durationSec > 0 && update.positionSec / update.durationSec >= 0.92)) patch.completed = true;
  return (await db.update("listening_progress", { id: row.id }, patch))[0];
}

export async function setFavorite(familyId: string, storyId: string, favorite: boolean) {
  const row = await getOrCreate(familyId, storyId);
  return (await getDb().update("listening_progress", { id: row.id }, { favorite }))[0];
}

export async function setWordDiscussed(familyId: string, storyId: string, discussed: boolean) {
  const row = await getOrCreate(familyId, storyId);
  return (await getDb().update("listening_progress", { id: row.id }, { word_discussed: discussed }))[0];
}

export async function getProgressMap(familyId: string): Promise<Map<string, ListeningProgressRow>> {
  const rows = await getDb().find("listening_progress", { family_id: familyId });
  return new Map(rows.map((r) => [r.story_id, r]));
}

export async function lastListenedAt(familyId: string): Promise<Date | null> {
  const rows = await getDb().find("listening_progress", { family_id: familyId, last_played_at: { neq: null } }, { orderBy: { column: "last_played_at", ascending: false }, limit: 1 });
  return rows[0]?.last_played_at ? new Date(rows[0].last_played_at) : null;
}
