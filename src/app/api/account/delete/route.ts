import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { deleteFamilyData } from "@/lib/services/families";
import { signOut } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { config, hasStripe, isDemoMode } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { confirm } = z.object({ confirm: z.literal("USUŃ") }).parse(await readJson(req));
    void confirm;
    const fid = session.bundle.family.id;
    // anuluj abonament Stripe natychmiast, by nie obciążać konta po usunięciu danych
    if (hasStripe()) {
      const { stripe } = await import("@/lib/services/billing");
      for (const s of await getDb().find("subscriptions", { family_id: fid, source: "stripe" })) {
        if (s.stripe_subscription_id && ["active", "trialing", "past_due"].includes(s.status)) await stripe().subscriptions.cancel(s.stripe_subscription_id).catch(() => undefined);
      }
    }
    await deleteFamilyData(fid);
    await getDb().delete("users", { id: session.user.id });
    if (!isDemoMode()) {
      const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });
      await admin.auth.admin.deleteUser(session.user.id);
    }
    await signOut();
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
