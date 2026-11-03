import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { AccessDeniedError, assertStoryAccessible } from "@/lib/services/access";
import { buildTemplateContext } from "@/lib/services/families";
import { prepareGreetingForStory } from "@/lib/services/greetings";

/** Przygotowanie (z cache) powitania dla bajki — wywoływane PRZED rozpoznaniem komendy, żeby odpowiedź była natychmiastowa. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { storyId } = z.object({ storyId: z.string().max(80) }).parse(await readJson(req));
    const { story } = await assertStoryAccessible(session.bundle.family, storyId);
    const ctx = buildTemplateContext(session.bundle);
    if (!ctx) return error("Brak profilu dziecka", 400);
    const g = await prepareGreetingForStory(session.bundle.family.id, ctx, session.bundle.family.locale, story.dayNumber);
    return json(g);
  } catch (e) {
    if (e instanceof AccessDeniedError) return error("Bajka niedostępna", 403);
    return handleError(e);
  }
}
