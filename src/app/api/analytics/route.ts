import { z } from "zod";
import { error, json, readJson } from "@/lib/api";
import { isAllowedEvent, track } from "@/lib/services/analytics";
import { getSessionUser } from "@/lib/auth/session";
import { getFamilyByOwner } from "@/lib/services/families";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

const body = z.object({ name: z.string().max(60), props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(), anonId: z.string().max(64).optional() });

export async function POST(req: Request) {
  try {
    const data = body.parse(await readJson(req, 4000));
    if (!isAllowedEvent(data.name)) return error("unknown_event", 422);
    const rl = await rateLimit("analytics", clientIp(req.headers), 300, 3600);
    if (!rl.ok) return json({ ok: false });
    const user = await getSessionUser().catch(() => null);
    const family = user ? await getFamilyByOwner(user.id) : null;
    await track(data.name, { familyId: family?.id ?? null, anonId: data.anonId ?? null, props: data.props });
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 400);
  }
}
