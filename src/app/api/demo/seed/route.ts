import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { isDemoMode } from "@/lib/config";
import { demoSignIn } from "@/lib/auth/session";
import { DEMO_FAMILY, seedDemoFamily } from "@/lib/demo/seed";
import { ensureStoriesSeeded } from "@/lib/services/stories";

export async function POST(req: Request) {
  try {
    if (!isDemoMode()) return error("Niedostępne", 404);
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const { kind } = z.object({ kind: z.enum(["family", "fresh", "admin"]) }).parse(await readJson(req));
    await ensureStoriesSeeded(true);
    if (kind === "admin") {
      const u = await demoSignIn("admin.demo@elofik.com", { admin: true });
      await seedDemoFamily(u.id, { daysAgo: 6 });
      return json({ redirect: "/admin" });
    }
    if (kind === "fresh") {
      const u = await demoSignIn(`rodzina.${Date.now()}@demo.elofik.com`);
      await seedDemoFamily(u.id, { daysAgo: 0, subscribed: false });
      return json({ redirect: "/app?witaj=1" });
    }
    const u = await demoSignIn(DEMO_FAMILY.email);
    await seedDemoFamily(u.id, { daysAgo: 6 });
    return json({ redirect: "/app" });
  } catch (e) {
    return handleError(e);
  }
}
