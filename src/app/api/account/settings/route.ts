import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { getDb, nowIso } from "@/lib/db";
import { isValidTimezone } from "@/lib/domain/unlock";
import { ROUTINE_IDS, routineById } from "@/lib/domain/routine";

const schema = z.object({
  voiceGreetingEnabled: z.boolean().optional(),
  emailDaily: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  marketingConsent: z.boolean().optional(),
  timezone: z.string().max(60).optional(),
  routine: z.enum(ROUTINE_IDS).optional(),
});

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const b = schema.parse(await readJson(req));
    const db = getDb();
    const fid = session.bundle.family.id;
    const famPatch: Record<string, unknown> = {};
    if (b.voiceGreetingEnabled !== undefined) {
      famPatch.voice_greeting_enabled = b.voiceGreetingEnabled;
      if (b.voiceGreetingEnabled && !session.bundle.family.voice_consent_at) famPatch.voice_consent_at = nowIso();
    }
    if (b.marketingConsent !== undefined) famPatch.marketing_consent_at = b.marketingConsent ? nowIso() : null;
    if (b.timezone && isValidTimezone(b.timezone)) famPatch.timezone = b.timezone;
    if (b.routine) {
      famPatch.listening_routine = b.routine;
      // przypomnienie przesuwa się razem z rutyną (o ile rodzic nie wybrał godziny w tym samym żądaniu)
      if (b.sendHour === undefined) b.sendHour = routineById(b.routine)!.hour;
    }
    if (Object.keys(famPatch).length) await db.update("families", { id: fid }, famPatch);
    if (b.emailDaily !== undefined || b.pushEnabled !== undefined || b.sendHour !== undefined) {
      const existing = await db.findOne("notification_preferences", { family_id: fid });
      await db.upsert(
        "notification_preferences",
        {
          family_id: fid,
          email_daily: b.emailDaily ?? existing?.email_daily ?? false,
          push_enabled: b.pushEnabled ?? existing?.push_enabled ?? false,
          send_hour: b.sendHour ?? existing?.send_hour ?? 17,
          updated_at: nowIso(),
        },
        ["family_id"],
      );
    }
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
