import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { createFreeGiftStory, freeGiftSchema } from "@/lib/services/gifts";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const raw = (await readJson(req)) as Record<string, unknown>;
    if (raw.website) return error("Nieprawidłowe żądanie", 400); // honeypot
    const input = freeGiftSchema.parse(raw);
    const ip = clientIp(req.headers);
    const [h, d] = await Promise.all([rateLimit("gift-free-h", ip, 5, 3600), rateLimit("gift-free-d", ip, 12, 86_400)]);
    if (!h.ok || !d.ok) return error("Elofik musi chwilę odpocząć. Spróbuj później 🙂", 429);
    const res = await createFreeGiftStory(input);
    return json({ token: res.token, path: `/prezent/${res.token}`, url: res.url });
  } catch (e) {
    return handleError(e);
  }
}
