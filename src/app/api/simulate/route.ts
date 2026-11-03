import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { hasStripe } from "@/lib/config";
import { apiFamily } from "@/lib/auth/guards";
import { simulateCancel, simulateSubscription } from "@/lib/services/billing";
import { markGiftPaid } from "@/lib/services/gifts";
import { PRICING } from "@/lib/domain/pricing";
import { getDb } from "@/lib/db";

/** Symulacja płatności — dostępna WYŁĄCZNIE, gdy Stripe nie jest skonfigurowany (demo/dev). */
export async function POST(req: Request) {
  try {
    if (hasStripe()) return error("Niedostępne", 404);
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const b = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("subscription") }),
      z.object({ kind: z.literal("cancel") }),
      z.object({ kind: z.literal("gift"), giftId: z.string().uuid() }),
    ]).parse(await readJson(req));
    if (b.kind === "gift") {
      await markGiftPaid(b.giftId, `demo-${Date.now()}`, PRICING.giftMonthGross);
      const { activationTokenFor } = await import("@/lib/services/gifts");
      const purchase = await getDb().findOne("gift_purchases", { id: b.giftId });
      return json({ ok: true, activationPath: purchase?.status === "paid" ? `/aktywuj-prezent/${activationTokenFor(b.giftId)}` : null });
    }
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    if (b.kind === "subscription") {
      const active = await getDb().find("subscriptions", { family_id: session.bundle.family.id, status: "active", source: "demo" });
      if (!active.length) await simulateSubscription(session.bundle.family.id);
    } else await simulateCancel(session.bundle.family.id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
