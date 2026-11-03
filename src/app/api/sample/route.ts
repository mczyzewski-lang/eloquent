import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { SAMPLE_STORY } from "@/content/sample";
import { addressForm, getNameForms, validateName } from "@/lib/domain/names";
import { buildRenderPlan } from "@/lib/domain/story";
import { currentVoiceProfile } from "@/lib/audio/tts";
import { assemblePlan, signedAudioUrl } from "@/lib/services/audio-pipeline";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";
import { getDb } from "@/lib/db";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

const body = z.object({ name: z.string().max(40), website: z.string().max(200).optional() });

/**
 * Próbka z landing page — bez konta. Ochrona przed nadużyciami:
 * honeypot, walidacja imienia, limity na IP (godzinowy i dzienny), dzienny budżet kosztów próbek,
 * cache per imię (to samo imię = zero nowych kosztów).
 */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const { name, website } = body.parse(await readJson(req));
    if (website) return error("Nieprawidłowe żądanie", 400);
    const v = validateName(name);
    if (!v.ok) return error("Nieprawidłowe imię", 422);
    const ip = clientIp(req.headers);
    const [hour, day] = await Promise.all([rateLimit("sample-h", ip, 10, 3600), rateLimit("sample-d", ip, 30, 86_400)]);
    if (!hour.ok || !day.ok) return error("Elofik musi chwilę odpocząć. Spróbuj za jakiś czas 🙂", 429);

    await ensureRuntimeSettings();
    const forms = getNameForms(v.name);
    const ctx = { child: { name: forms.nominative, address: addressForm(forms, "diminutive"), gender: forms.gender }, family: {} };
    const plan = buildRenderPlan(SAMPLE_STORY, ctx, currentVoiceProfile());
    const res = await assemblePlan(plan, { purposeShared: "sample", purposePersonal: "sample", language: "pl" });
    const first = await getDb().findOne("audio_cache", { cache_key: plan.segments[0].cacheKey });
    return json({
      audioUrl: await signedAudioUrl(res.assembly.storage_path, 3600),
      provider: first?.provider ?? "mock",
      timeline: res.assembly.timeline,
      durationMs: res.assembly.duration_ms,
    });
  } catch (e) {
    return handleError(e);
  }
}
