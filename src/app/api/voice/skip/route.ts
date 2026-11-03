import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { recordSkip } from "@/lib/services/voice";
import { track } from "@/lib/services/analytics";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { storyId, reason } = z.object({ storyId: z.string().max(80), reason: z.string().max(40).optional() }).parse(await readJson(req));
    await recordSkip(session.bundle.family.id, storyId);
    await track("voice_greeting_skipped", { familyId: session.bundle.family.id, props: { reason: reason ?? "parent" } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
