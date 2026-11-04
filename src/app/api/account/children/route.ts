import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { addChild, onboardingSchema, removeChild, switchChild } from "@/lib/services/families";
import { enqueueJob } from "@/lib/services/jobs";
import { track } from "@/lib/services/analytics";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), child: onboardingSchema.shape.child, interests: z.array(z.string().max(30)).max(12).default([]) }),
  z.object({ action: z.literal("switch"), childId: z.string().uuid() }),
  z.object({ action: z.literal("remove"), childId: z.string().uuid() }),
]);

/** Dzieci w rodzinie: dodanie kolejnego, przełączenie aktywnego, usunięcie. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const fid = session.bundle.family.id;
    const b = body.parse(await readJson(req));
    try {
      if (b.action === "add") {
        const child = await addChild(fid, b.child, b.interests);
        await track("child_added", { familyId: fid });
        await enqueueJob("render_greeting", { familyId: fid, nextStoryDay: 1 }, { dedupeKey: `greet-${fid}-${child.id}` });
        return json({ ok: true, childId: child.id });
      }
      if (b.action === "switch") {
        await switchChild(fid, b.childId);
        return json({ ok: true });
      }
      await removeChild(fid, b.childId);
      return json({ ok: true });
    } catch (e) {
      if (e instanceof Error && !(e instanceof z.ZodError)) return error(e.message, 422);
      throw e;
    }
  } catch (e) {
    return handleError(e);
  }
}
