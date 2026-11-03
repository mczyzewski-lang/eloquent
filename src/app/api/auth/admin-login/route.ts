import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { adminConfigFingerprint, adminPasswordConfigured, adminUserId, checkAdminCredentials } from "@/lib/auth/admin-password";
import { adminSignIn } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import { clientIp, hit, isLimited } from "@/lib/services/rate-limit";

/** Logowanie admina hasłem z limitem nieudanych prób. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    if (!adminPasswordConfigured()) return error("Logowanie hasłem nie jest skonfigurowane (ADMIN_EMAILS, ADMIN_PASSWORD_HASH).", 404);
    const { email, password } = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) }).parse(await readJson(req));
    const normalized = email.trim().toLowerCase();
    const ip = clientIp(req.headers);
    // liczymy wyłącznie NIEUDANE próby: 5 / 15 min na IP, 10 / godz. na konto
    const [ipBlocked, acctBlocked] = await Promise.all([isLimited("admin-fail-ip", ip, 5, 900), isLimited("admin-fail-acct", normalized, 10, 3600)]);
    if (ipBlocked || acctBlocked) return error("Za dużo nieudanych prób logowania. Spróbuj za 15 minut.", 429);
    const check = checkAdminCredentials(normalized, password);
    if (!check.ok) {
      await Promise.all([hit("admin-fail-ip", ip, 900), hit("admin-fail-acct", normalized, 3600)]);
      // przyczyna tylko w logach serwera (Railway → Deployments → Logs), nigdy w odpowiedzi dla przeglądarki
      console.warn("[admin-login] odmowa:", check.reason, JSON.stringify({ ...adminConfigFingerprint(), passwordLength: password.length }));
      return error("Nieprawidłowy e-mail lub hasło.", 401);
    }
    await adminSignIn(normalized);
    await auditLog({ id: adminUserId(normalized), email: normalized, isAdmin: true }, "admin.login", normalized, { ip: ip.replace(/\d+$/, "x") });
    return json({ ok: true, redirect: "/admin" });
  } catch (e) {
    return handleError(e);
  }
}
