import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { createGiftPurchase, giftPurchaseSchema } from "@/lib/services/gifts";
import { startGiftCheckout } from "@/lib/services/billing";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const input = giftPurchaseSchema.parse(await readJson(req));
    const rl = await rateLimit("gift-buy", clientIp(req.headers), 10, 3600);
    if (!rl.ok) return error("Za dużo prób, spróbuj za chwilę", 429);
    const gift = await createGiftPurchase(input);
    const checkout = await startGiftCheckout(gift.id, input.buyerEmail);
    return json(checkout);
  } catch (e) {
    return handleError(e);
  }
}
