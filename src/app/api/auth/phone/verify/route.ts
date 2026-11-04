import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { isDemoMode } from "@/lib/config";
import { normalizePhone } from "@/lib/domain/phone";
import { phoneSignIn } from "@/lib/auth/session";
import { PhoneAuthError, verifyPhoneCode } from "@/lib/services/phone-auth";
import { clientIp } from "@/lib/services/rate-limit";
import { track } from "@/lib/services/analytics";
import { getDb } from "@/lib/db";

/** Krok 2: weryfikacja kodu i zalogowanie (konto tworzone przy pierwszym logowaniu). */
export async function POST(req: Request) {
  try {
    if (!isDemoMode()) return error("Logowanie SMS obsługuje Supabase Auth", 404);
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const b = z.object({ phone: z.string().max(30), code: z.string().max(10) }).parse(await readJson(req));
    const phone = normalizePhone(b.phone);
    if (!phone) return error("Nieprawidłowy numer telefonu.", 422);
    await verifyPhoneCode(phone, b.code, clientIp(req.headers));
    const existed = Boolean(await getDb().findOne("users", { phone }));
    const user = await phoneSignIn(phone);
    if (!existed) await track("account_created", { props: { method: "phone" } });
    return json({ ok: true, userId: user.id, newAccount: !existed });
  } catch (e) {
    if (e instanceof PhoneAuthError) return error(e.message, e.status);
    return handleError(e);
  }
}
