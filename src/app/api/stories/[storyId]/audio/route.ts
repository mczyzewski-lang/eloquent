import { error, handleError, json } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { AccessDeniedError, assertStoryAccessible } from "@/lib/services/access";
import { buildTemplateContext } from "@/lib/services/families";
import { renderStoryForFamily, signedAudioUrl } from "@/lib/services/audio-pipeline";
import { getDb } from "@/lib/db";

/**
 * Zwraca podpisany URL gotowego pliku bajki dla rodziny. Przy pierwszym odsłuchu składa plik
 * (CORE z cache + brakująca personalizacja); kolejne odsłuchy — wyłącznie gotowy plik.
 * Autoryzacja: tylko odblokowane bajki własnej rodziny (czas serwera).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await params;
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const { bundle } = session;
    const { story } = await assertStoryAccessible(bundle.family, storyId);
    const res = await renderStoryForFamily(story, buildTemplateContext(bundle), bundle.family.id);
    const provider = (await getDb().findOne("audio_cache", { cache_key: res.assembly.segment_keys[0] }))?.provider ?? "mock";
    const progress = await getDb().findOne("listening_progress", { family_id: bundle.family.id, story_id: storyId });
    return json({
      audioUrl: await signedAudioUrl(res.assembly.storage_path),
      durationMs: res.assembly.duration_ms,
      timeline: res.assembly.timeline,
      provider,
      resumeAt: progress && !progress.completed ? progress.position_sec : 0,
      favorite: progress?.favorite ?? false,
    });
  } catch (e) {
    if (e instanceof AccessDeniedError) return error(e.code === "locked" ? "Ta bajka jeszcze śpi. Odblokuje się o 6:00." : "Nie znaleziono bajki", e.code === "locked" ? 403 : 404);
    return handleError(e);
  }
}
