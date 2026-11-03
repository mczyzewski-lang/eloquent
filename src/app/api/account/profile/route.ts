import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { onboardingSchema, saveChildAndFamily } from "@/lib/services/families";

const schema = onboardingSchema.pick({ child: true, members: true, interests: true });

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const input = schema.parse(await readJson(req));
    await saveChildAndFamily(session.bundle.family.id, input);
    // segmenty personalizowane wygenerują się przy kolejnym odsłuchu tylko dla zmienionych imion (cache po treści)
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
