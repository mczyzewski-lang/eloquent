import { config } from "@/lib/config";
import { getDb, nowIso, type FamilyRow } from "@/lib/db";
import { computeUnlockState, type UnlockState } from "@/lib/domain/unlock";
import type { StoryVersion } from "@/lib/domain/story";
import { getPublishedSequence } from "./stories";

/** Statusy Stripe uznawane za aktywny dostęp. past_due = okres karencji podczas ponawiania płatności. */
const ACTIVE = new Set(["active", "trialing", "past_due"]);

export interface AccessInfo {
  hasAccess: boolean;
  source: "stripe" | "gift" | "referral" | "demo" | null;
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  autoRenews: boolean;
}

export async function getAccess(familyId: string, now = new Date()): Promise<AccessInfo> {
  const db = getDb();
  const subs = await db.find("subscriptions", { family_id: familyId });
  const nowIsoStr = now.toISOString();
  const activeSub = subs
    .filter((s) => ACTIVE.has(s.status) && (!s.current_period_end || s.current_period_end > nowIsoStr))
    .sort((a, b) => (b.current_period_end ?? "").localeCompare(a.current_period_end ?? ""))[0];
  if (activeSub) {
    return {
      hasAccess: true,
      source: activeSub.source,
      endsAt: activeSub.current_period_end,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
      autoRenews: activeSub.source === "stripe" && !activeSub.cancel_at_period_end,
    };
  }
  const gifts = await db.find("gift_entitlements", { family_id: familyId, ends_at: { gt: nowIsoStr } });
  const gift = gifts.filter((g) => g.starts_at <= nowIsoStr).sort((a, b) => b.ends_at.localeCompare(a.ends_at))[0];
  if (gift) return { hasAccess: true, source: "gift", endsAt: gift.ends_at, cancelAtPeriodEnd: true, autoRenews: false };
  return { hasAccess: false, source: null, endsAt: null, cancelAtPeriodEnd: false, autoRenews: false };
}

export interface FamilyLibrary {
  access: AccessInfo;
  unlock: UnlockState;
  stories: StoryVersion[];
  unlocked: StoryVersion[];
  today: StoryVersion | null;
  tomorrow: StoryVersion | null;
}

export async function getFamilyLibrary(family: FamilyRow, now = new Date()): Promise<FamilyLibrary> {
  const [access, stories] = await Promise.all([getAccess(family.id, now), getPublishedSequence(family.locale)]);
  const unlock = family.activated_at
    ? computeUnlockState({
        activatedAt: new Date(family.activated_at),
        now,
        timezone: family.timezone,
        unlockHour: config.unlockHour,
        totalStories: stories.length,
        hasAccess: access.hasAccess,
      })
    : { unlockedThrough: 0, todayDay: 0, nextUnlockAt: null, nextDay: null };
  const unlocked = stories.filter((s) => s.dayNumber <= unlock.unlockedThrough);
  // rejestr odblokowań (analityka: odsetek odblokowanych bajek faktycznie odtworzonych)
  const db = getDb();
  for (const s of unlocked) {
    await db.upsert("story_unlocks", { family_id: family.id, story_id: s.storyId, day_number: s.dayNumber, unlocked_at: nowIso() }, ["family_id", "story_id"]).catch(() => undefined);
  }
  return {
    access,
    unlock,
    stories,
    unlocked,
    today: unlocked.find((s) => s.dayNumber === unlock.todayDay) ?? null,
    tomorrow: stories.find((s) => s.dayNumber === unlock.todayDay + 1) ?? null,
  };
}

export class AccessDeniedError extends Error {
  constructor(public code: "not_found" | "locked" | "forbidden") {
    super(code);
  }
}

/** Autoryzacja dostępu do konkretnej bajki — zawsze po stronie serwera. */
export async function assertStoryAccessible(family: FamilyRow, storyId: string, now = new Date()): Promise<{ story: StoryVersion; library: FamilyLibrary }> {
  const library = await getFamilyLibrary(family, now);
  const story = library.stories.find((s) => s.storyId === storyId);
  if (!story) throw new AccessDeniedError("not_found");
  if (story.dayNumber > library.unlock.unlockedThrough) throw new AccessDeniedError("locked");
  return { story, library };
}
