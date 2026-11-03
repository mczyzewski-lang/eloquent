import { isDemoMode, hasElevenLabs, hasOpenAI, hasStripe } from "@/lib/config";
import { hasFfmpeg } from "@/lib/audio/ffmpeg";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export const dynamic = "force-dynamic";

/** Healthcheck Railway — bez sekretów, tylko flagi gotowości. */
export async function GET() {
  await ensureRuntimeSettings();
  return Response.json({
    ok: true,
    mode: isDemoMode() ? "demo" : "production",
    ffmpeg: await hasFfmpeg(),
    integrations: { elevenlabs: hasElevenLabs(), openai: hasOpenAI(), stripe: hasStripe() },
  });
}
