import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { config, isDemoMode } from "@/lib/config";
import { demoSignIn } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";
import { track } from "@/lib/services/analytics";

export async function POST(req: Request) {
  try {
    if (!isDemoMode()) return error("Niedostępne", 404);
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const { email } = z.object({ email: z.string().email().max(200) }).parse(await readJson(req));
    if (config.adminEmails.includes(email.trim().toLowerCase())) return error("To konto administratora — zaloguj się hasłem na /logowanie/admin.", 403);
    const rl = await rateLimit("demo-login", clientIp(req.headers), 30, 3600);
    if (!rl.ok) return error("Za dużo prób", 429);
    const user = await demoSignIn(email);
    await track("account_created", { props: { demo: true } });
    return json({ ok: true, userId: user.id });
  } catch (e) {
    return handleError(e);
  }
}
