import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { AccessDeniedError, assertStoryAccessible } from "@/lib/services/access";
import { startVoiceSession, VoiceLimitError } from "@/lib/services/voice";
import { track } from "@/lib/services/analytics";

/** Jednorazowy token Scribe v2 Realtime (generowany na backendzie) + parametry krótkiej sesji. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { storyId } = z.object({ storyId: z.string().max(80) }).parse(await readJson(req));
    await assertStoryAccessible(session.bundle.family, storyId);
    const res = await startVoiceSession(session.bundle.family.id, storyId, session.bundle.family.locale);
    await track("voice_greeting_started", { familyId: session.bundle.family.id, props: { mode: res.mode, attempt: res.attempt } });
    return json(res, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof VoiceLimitError) return error("Limit prób na dziś — rozpocznij bajkę dotykiem.", 429, { code: e.code });
    if (e instanceof AccessDeniedError) return error("Bajka niedostępna", 403);
    return handleError(e);
  }
}
