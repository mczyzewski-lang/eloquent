import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { getDb, nowIso } from "@/lib/db";

/** Świadoma zgoda rodzica na krótkie użycie mikrofonu w rytuale (i jej cofnięcie). */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { enabled } = z.object({ enabled: z.boolean() }).parse(await readJson(req));
    await getDb().update("families", { id: session.bundle.family.id }, { voice_consent_at: enabled ? nowIso() : null, voice_greeting_enabled: enabled });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
