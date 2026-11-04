/**
 * Logowanie rodzica numerem telefonu: 6-cyfrowy kod SMS.
 * - kod ważny 5 min, maks. 5 prób, nowy kod unieważnia poprzedni,
 * - w bazie wyłącznie HMAC kodu (nigdy sam kod),
 * - limity: 1 SMS / 45 s i 5 SMS / godz. na numer, 20 / godz. na IP (koszt i nadużycia).
 * Bez skonfigurowanej bramki SMS (Admin → Ustawienia → SMSAPI) kod jest zwracany do pokazania na ekranie (tryb testowy).
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import { hasSmsGateway, sendSms } from "./sms";
import { hit, isLimited, rateLimit } from "./rate-limit";

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 45;

export class PhoneAuthError extends Error {
  constructor(message: string, public status = 422) {
    super(message);
  }
}

function hashCode(phone: string, code: string) {
  return createHmac("sha256", getSessionSecret()).update(`otp|${phone}|${code}`).digest("hex");
}

export async function startPhoneLogin(phone: string, ip: string): Promise<{ sent: boolean; testCode?: string; resendInSeconds: number }> {
  if (!(await rateLimit("otp-ip", ip, 20, 3600)).ok) throw new PhoneAuthError("Za dużo prób z tego urządzenia. Spróbuj za godzinę.", 429);
  if (!(await rateLimit("otp-resend", phone, 1, OTP_RESEND_SECONDS)).ok) throw new PhoneAuthError(`Kod został już wysłany. Nowy możesz wysłać za chwilę (do ${OTP_RESEND_SECONDS} s).`, 429);
  if (!(await rateLimit("otp-phone", phone, 5, 3600)).ok) throw new PhoneAuthError("Wysłaliśmy już kilka kodów na ten numer. Spróbuj za godzinę.", 429);

  const db = getDb();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // nowy kod unieważnia poprzednie
  await db.update("phone_otps", { phone, consumed_at: null }, { consumed_at: nowIso() });
  await db.insert("phone_otps", { phone, code_hash: hashCode(phone, code), expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(), attempts: 0, consumed_at: null, created_at: nowIso() });

  if (!(await hasSmsGateway())) return { sent: false, testCode: code, resendInSeconds: OTP_RESEND_SECONDS };
  try {
    await sendSms(phone, `Elofik: Twój kod logowania to ${code}. Ważny 5 minut. Nie podawaj go nikomu.`);
  } catch (e) {
    console.error("[sms] wysyłka nieudana:", (e as Error).message);
    throw new PhoneAuthError("Nie udało się wysłać SMS. Sprawdź numer i spróbuj ponownie za chwilę.", 502);
  }
  return { sent: true, resendInSeconds: OTP_RESEND_SECONDS };
}

/** Sprawdza kod; przy sukcesie zużywa go. Nie mówi, czy numer istnieje (to samo zachowanie dla każdego numeru). */
export async function verifyPhoneCode(phone: string, code: string, ip: string): Promise<void> {
  if (await isLimited("otp-verify-ip", ip, 30, 3600)) throw new PhoneAuthError("Za dużo prób. Spróbuj za godzinę.", 429);
  const db = getDb();
  const rows = await db.find("phone_otps", { phone, consumed_at: null }, { orderBy: { column: "created_at", ascending: false }, limit: 1 });
  const otp = rows[0];
  const fail = async (msg: string) => {
    await hit("otp-verify-ip", ip, 3600);
    throw new PhoneAuthError(msg);
  };
  if (!otp || new Date(otp.expires_at).getTime() < Date.now()) return fail("Kod wygasł. Wyślij nowy kod.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return fail("Za dużo błędnych prób. Wyślij nowy kod.");
  const expected = Buffer.from(otp.code_hash, "hex");
  const given = Buffer.from(hashCode(phone, code.trim()), "hex");
  if (!/^\d{6}$/.test(code.trim()) || !timingSafeEqual(expected, given)) {
    await db.update("phone_otps", { id: otp.id }, { attempts: otp.attempts + 1 });
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return fail(left > 0 ? `Nieprawidłowy kod. Pozostało prób: ${left}.` : "Za dużo błędnych prób. Wyślij nowy kod.");
  }
  await db.update("phone_otps", { id: otp.id }, { consumed_at: nowIso() });
}
