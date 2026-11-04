import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { CustomStoryError, customStoryRequestSchema } from "@/lib/ai/custom-story";
import { createCustomStory, deleteCustomStory } from "@/lib/services/custom-stories";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

export const maxDuration = 120;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), request: customStoryRequestSchema }),
  z.object({ action: z.literal("delete"), storyId: z.string().regex(/^wlasna-[a-z0-9]{8}$/) }),
]);

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const b = body.parse(await readJson(req));
    const { family, child } = session.bundle;
    if (b.action === "delete") {
      await deleteCustomStory(family.id, b.storyId);
      return json({ ok: true });
    }
    if (!(await rateLimit("custom-story", clientIp(req.headers), 10, 3600)).ok) return error("Za dużo prób. Spróbuj za godzinę.", 429);
    // tylko relacje, które rodzina naprawdę ma w profilu
    const have = new Set(session.bundle.members.map((m) => m.relation));
    const request = { ...b.request, relations: b.request.relations.filter((r) => have.has(r)) };
    const row = await createCustomStory(family, child?.id ?? null, child?.age ?? 5, request);
    return json({ storyId: row.story_id, title: row.title });
  } catch (e) {
    if (e instanceof CustomStoryError) return error(e.message, 422);
    if ((e as Error).name === "BudgetExceededError") return error("Elofik odpoczywa — spróbuj ponownie później.", 503);
    return handleError(e);
  }
}
