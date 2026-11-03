import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { createOrUpdateFamily, onboardingSchema, getFamilyByOwner } from "@/lib/services/families";
import { enqueueJob } from "@/lib/services/jobs";
import { track } from "@/lib/services/analytics";
import { getDb } from "@/lib/db";
import { getPublishedSequence } from "@/lib/services/stories";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await getSessionUser();
    if (!user) return error("Zaloguj się", 401);
    const input = onboardingSchema.parse(await readJson(req));
    const existed = await getFamilyByOwner(user.id);
    // kod polecający: tylko istniejący i nie własny
    if (input.referralCode) {
      const ref = await getDb().findOne("families", { referral_code: input.referralCode });
      if (!ref || ref.owner_user_id === user.id) input.referralCode = null;
    }
    const family = await createOrUpdateFamily(user.id, input);
    if (!existed) {
      await track("onboarding_completed", { familyId: family.id, props: { members: input.members.length, interests: input.interests.length } });
      if (input.referralCode) await track("referral_signup", { familyId: family.id });
    }
    // przygotowanie w tle: powitania (pierwsze spotkanie + jutro) i render Dnia 1
    await enqueueJob("render_greeting", { familyId: family.id, nextStoryDay: 1 }, { dedupeKey: `greet-${family.id}-1` });
    const [day1] = await getPublishedSequence(family.locale);
    if (day1) await enqueueJob("render_story", { familyId: family.id, storyId: day1.storyId }, { dedupeKey: `story-${family.id}-${day1.storyId}` });
    return json({ ok: true, familyId: family.id });
  } catch (e) {
    return handleError(e);
  }
}
