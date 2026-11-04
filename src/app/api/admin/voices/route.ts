import { z } from "zod";
import { error, adminHandleError, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import type { VoiceCandidateRow } from "@/lib/db";
import { chooseLeadingVoice, chooseNarratorVoice, demoLibraryVoice, designVoices, listCandidates, listLibraryVoices, listTtsModels, renderModelDemos, saveDesignedVoice, VOICE_DESIGN_MODELS, VoiceStudioError } from "@/lib/services/voices";

export const maxDuration = 300;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("design"), name: z.string().max(60), description: z.string().min(20).max(1000), model: z.string().max(60).optional(), text: z.string().max(1000).optional() }),
  z.object({ action: z.literal("save"), candidateId: z.string().uuid() }),
  z.object({ action: z.literal("library") }),
  z.object({ action: z.literal("demo_library"), voiceId: z.string().max(40), name: z.string().max(80) }),
  z.object({ action: z.literal("choose"), voiceId: z.string().max(40), candidateId: z.string().uuid().optional(), model: z.string().max(60).nullable().optional() }),
  z.object({ action: z.literal("tts_models") }),
  z.object({ action: z.literal("model_demos"), candidateId: z.string().uuid(), models: z.array(z.string().max(60)).min(1).max(8) }),
  z.object({ action: z.literal("delete"), candidateId: z.string().uuid() }),
  z.object({ action: z.literal("narrator"), voiceId: z.string().max(40), candidateId: z.string().uuid().optional() }),
  z.object({ action: z.literal("narrator_off") }),
]);

async function view(c: VoiceCandidateRow) {
  return {
    id: c.id,
    source: c.source,
    name: c.name,
    description: c.description,
    voiceId: c.voice_id,
    designed: Boolean(c.generated_voice_id),
    previewUrl: c.preview_path ? await getStorage().signedUrl(c.preview_path, 6 * 3600) : null,
    modelDemos: await Promise.all((c.model_demos ?? []).map(async (d) => ({ model: d.model, error: d.error, url: d.path ? await getStorage().signedUrl(d.path, 6 * 3600) : null }))),
    createdAt: c.created_at,
  };
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await getSessionUser();
    if (!user?.isAdmin) return error("Brak uprawnień", 403);
    const b = body.parse(await readJson(req));
    switch (b.action) {
      case "design": {
        const rows = await designVoices(b);
        await auditLog(user, "voice.design", b.name, { count: rows.length });
        return json({ candidates: await Promise.all(rows.map(view)) });
      }
      case "save": {
        const row = await saveDesignedVoice(b.candidateId);
        await auditLog(user, "voice.save", row.voice_id, { candidate: row.id });
        return json({ candidate: await view(row) });
      }
      case "library":
        return json({ voices: await listLibraryVoices() });
      case "demo_library": {
        const row = await demoLibraryVoice(b.voiceId, b.name);
        return json({ candidate: await view(row) });
      }
      case "choose": {
        let voiceId = b.voiceId;
        // podgląd z Voice Design trzeba najpierw zapisać jako głos
        if (!voiceId && b.candidateId) voiceId = (await saveDesignedVoice(b.candidateId)).voice_id!;
        const res = await chooseLeadingVoice(voiceId, user.email, b.model ?? null);
        await auditLog(user, "voice.choose", res.voiceId, { version: res.version, model: res.model });
        return json(res);
      }
      case "tts_models":
        return json({ models: await listTtsModels(), allModels: await listTtsModels({ all: true }), designModels: VOICE_DESIGN_MODELS });
      case "model_demos": {
        const row = await renderModelDemos(b.candidateId, b.models);
        return json({ candidate: await view(row) });
      }
      case "narrator": {
        let voiceId = b.voiceId;
        if (!voiceId && b.candidateId) voiceId = (await saveDesignedVoice(b.candidateId)).voice_id!;
        const res = await chooseNarratorVoice(voiceId, user.email);
        await auditLog(user, "voice.narrator", voiceId);
        return json(res);
      }
      case "narrator_off": {
        await chooseNarratorVoice(null, user.email);
        await auditLog(user, "voice.narrator_off", null);
        return json({ narratorVoiceId: null });
      }
      case "delete": {
        await getDb().delete("voice_candidates", { id: b.candidateId });
        return json({ ok: true });
      }
    }
  } catch (e) {
    if (e instanceof VoiceStudioError) return error(e.message, (e as { status?: number }).status === 401 ? 401 : 422);
    if ((e as Error).name === "BudgetExceededError") return error("Brak budżetu AI — ustaw miesięczny budżet w Ustawieniach.", 422);
    return adminHandleError(e, "voices");
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return error("Brak uprawnień", 403);
  return json({ candidates: await Promise.all((await listCandidates()).map(view)) });
}
