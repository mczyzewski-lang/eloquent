import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { isDemoMode } from "@/lib/config";
import { normalizePhone } from "@/lib/domain/phone";
import { PhoneAuthError, startPhoneLogin } from "@/lib/services/phone-auth";
import { clientIp } from "@/lib/services/rate-limit";

/** Krok 1: wysłanie kodu SMS. (Z Supabase Auth kod wysyła Supabase — ten endpoint jest wtedy nieużywany.) */
export async function POST(req: Request) {
  try {
    if (!isDemoMode()) return error("Logowanie SMS obsługuje Supabase Auth", 404);
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const { phone: raw } = z.object({ phone: z.string().max(30) }).parse(await readJson(req));
    const phone = normalizePhone(raw);
    if (!phone) return error("Podaj poprawny numer telefonu, np. 600 123 456.", 422);
    return json(await startPhoneLogin(phone, clientIp(req.headers)));
  } catch (e) {
    if (e instanceof PhoneAuthError) return error(e.message, e.status);
    return handleError(e);
  }
}
