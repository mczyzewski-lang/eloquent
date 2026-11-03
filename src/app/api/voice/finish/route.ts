import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { finishVoiceSession } from "@/lib/services/voice";
import { track } from "@/lib/services/analytics";

/** Wynik sesji. Przyjmujemy wyłącznie wynik i pewność dopasowania — nigdy treść wypowiedzi. */
const body = z.object({
  sessionId: z.string().uuid(),
  outcome: z.enum(["recognized", "failed", "timeout", "error"]),
  durationMs: z.number().int().min(0).max(60_000),
  confidence: z.number().min(0).max(1).nullable(),
});

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const b = body.parse(await readJson(req));
    const row = await finishVoiceSession(session.bundle.family.id, b.sessionId, b.outcome, b.durationMs, b.confidence);
    if (!row) return error("Nie znaleziono sesji", 404);
    await track(b.outcome === "recognized" ? "voice_greeting_recognized" : "voice_greeting_failed", { familyId: session.bundle.family.id, props: { outcome: b.outcome, ms: row.duration_ms } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
