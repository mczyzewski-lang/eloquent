import { z } from "zod";
import { error, adminHandleError, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import { getDb, nowIso } from "@/lib/db";
import { addressForm, getNameForms, nameCacheKey, validateName } from "@/lib/domain/names";
import { ensureGreetingAudio, generateGreetingSet, getGreetingBank } from "@/lib/services/greetings";
import { GREETINGS } from "@/lib/domain/greetings";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_template"), variantId: z.string().regex(/^[A-Z_0-9]{3,40}$/), locale: z.enum(["pl", "en", "es", "de", "fr"]), template: z.string().min(10).max(600), active: z.boolean() }),
  z.object({ action: z.literal("preview"), variantId: z.string(), locale: z.enum(["pl", "en", "es", "de", "fr"]), childName: z.string().max(30) }),
  z.object({ action: z.literal("generate_set"), childName: z.string().max(30), locale: z.enum(["pl", "en", "es", "de", "fr"]).default("pl") }),
  z.object({ action: z.literal("purge"), variantId: z.string().optional(), childName: z.string().optional() }),
]);

function ctxFor(name: string) {
  const v = validateName(name);
  if (!v.ok) throw new Error("Nieprawidłowe imię testowe");
  const f = getNameForms(v.name);
  return { child: { name: f.nominative, address: addressForm(f), gender: f.gender }, family: {} };
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await getSessionUser();
    if (!user?.isAdmin) return error("Brak uprawnień", 403);
    const b = body.parse(await readJson(req));
    const db = getDb();
    switch (b.action) {
      case "save_template": {
        if (/(św\.? mikołaj|renifer|choink|tęskni|smutn|płaka)/i.test(b.template)) return error("Tekst zawiera niedozwolone motywy (świąteczne lub zawstydzające dziecko).", 422);
        const base = GREETINGS.find((g) => g.id === b.variantId);
        const kind = base?.kind ?? (b.variantId.startsWith("FIRST") ? "FIRST_MEETING" : b.variantId.startsWith("BREAK") ? "RETURNING_AFTER_BREAK" : b.variantId.startsWith("SAMEDAY") ? "RETURNING_SAME_DAY" : "RETURNING_NEXT_DAY");
        await db.upsert("greetings", { variant_id: b.variantId, locale: b.locale, kind, template: b.template, active: b.active, updated_at: nowIso() }, ["variant_id", "locale"]);
        await auditLog(user, "greeting.save", b.variantId, { active: b.active });
        return json({ ok: true });
      }
      case "preview": {
        const variant = (await getGreetingBank()).find((g) => g.id === b.variantId && g.locale === b.locale);
        if (!variant) return error("Nie znaleziono wariantu", 404);
        return json(await ensureGreetingAudio(ctxFor(b.childName), variant, null));
      }
      case "generate_set": {
        const out = await generateGreetingSet(ctxFor(b.childName), b.locale);
        await auditLog(user, "greeting.generate_set", b.childName, { count: out.length });
        return json({ items: out });
      }
      case "purge": {
        const n = await db.delete("greeting_audio_cache", { ...(b.variantId ? { variant_id: b.variantId } : {}), ...(b.childName ? { child_name_key: nameCacheKey(b.childName) } : {}) });
        await auditLog(user, "greeting.purge", b.variantId ?? b.childName ?? "all", { removed: n });
        return json({ removed: n });
      }
    }
  } catch (e) {
    return adminHandleError(e, "greetings");
  }
}
