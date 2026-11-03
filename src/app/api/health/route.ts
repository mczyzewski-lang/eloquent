import { isDemoMode, hasElevenLabs, hasOpenAI, hasStripe } from "@/lib/config";
import { hasFfmpeg } from "@/lib/audio/ffmpeg";

export const dynamic = "force-dynamic";

/** Healthcheck Railway — bez sekretów, tylko flagi gotowości. */
export async function GET() {
  return Response.json({
    ok: true,
    mode: isDemoMode() ? "demo" : "production",
    ffmpeg: await hasFfmpeg(),
    integrations: { elevenlabs: hasElevenLabs(), openai: hasOpenAI(), stripe: hasStripe() },
  });
}
