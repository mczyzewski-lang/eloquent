import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { recordPlayback, setFavorite, setWordDiscussed } from "@/lib/services/progress";
import { getFamilyLibrary } from "@/lib/services/access";
import { buildTemplateContext } from "@/lib/services/families";
import { enqueueJob } from "@/lib/services/jobs";
import { track } from "@/lib/services/analytics";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("playback"), storyId: z.string().max(80), positionSec: z.number().min(0).max(7200), durationSec: z.number().min(0).max(7200), event: z.enum(["start", "progress", "complete"]) }),
  z.object({ action: z.literal("favorite"), storyId: z.string().max(80), value: z.boolean() }),
  z.object({ action: z.literal("word_discussed"), storyId: z.string().max(80), value: z.boolean() }),
  z.object({ action: z.literal("event"), storyId: z.string().max(80), name: z.enum(["voice_greeting_screen_viewed", "voice_greeting_response_played", "voice_greeting_to_story_started", "story_opened"]) }),
]);

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const familyId = session.bundle.family.id;
    const b = body.parse(await readJson(req));
    const library = await getFamilyLibrary(session.bundle.family);
    const story = library.unlocked.find((s) => s.storyId === b.storyId);
    if (!story) return error("Bajka niedostępna", 403);
    switch (b.action) {
      case "playback": {
        const row = await recordPlayback(familyId, b.storyId, b);
        if (b.event === "start") await track("story_play_started", { familyId, props: { day: story.dayNumber } });
        if (b.event === "complete") {
          await track("story_completed", { familyId, props: { day: story.dayNumber } });
          // przygotuj z wyprzedzeniem powitanie na kolejny dzień i render jutrzejszej bajki
          const ctx = buildTemplateContext(session.bundle);
          if (ctx) await enqueueJob("render_greeting", { familyId, nextStoryDay: story.dayNumber + 1 }, { dedupeKey: `greet-${familyId}-${story.dayNumber + 1}` });
        }
        return json({ ok: true, completed: row?.completed ?? false });
      }
      case "favorite":
        await setFavorite(familyId, b.storyId, b.value);
        if (b.value) await track("story_favorited", { familyId });
        return json({ ok: true });
      case "word_discussed":
        await setWordDiscussed(familyId, b.storyId, b.value);
        return json({ ok: true });
      case "event":
        await track(b.name, { familyId, props: { day: story.dayNumber } });
        return json({ ok: true });
    }
  } catch (e) {
    return handleError(e);
  }
}
