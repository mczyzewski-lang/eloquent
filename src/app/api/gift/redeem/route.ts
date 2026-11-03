import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { GiftRedeemError, redeemGift } from "@/lib/services/gifts";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await getSessionUser();
    if (!user) return error("Zaloguj się", 401);
    const rl = await rateLimit("gift-redeem", clientIp(req.headers), 20, 3600);
    if (!rl.ok) return error("Za dużo prób", 429);
    const { token } = z.object({ token: z.string().max(80) }).parse(await readJson(req));
    const res = await redeemGift(token, user.id);
    return json({ ok: true, endsAt: res.endsAt });
  } catch (e) {
    if (e instanceof GiftRedeemError) {
      const msg = { invalid: "Ten link jest nieprawidłowy lub wygasł.", already_redeemed: "Ten prezent został już aktywowany.", not_paid: "Płatność za prezent nie została jeszcze potwierdzona." }[e.code];
      return error(msg, 409, { code: e.code });
    }
    return handleError(e);
  }
}
