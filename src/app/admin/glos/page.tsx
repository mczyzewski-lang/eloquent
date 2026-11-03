import { config, hasElevenLabs } from "@/lib/config";
import { getStorage } from "@/lib/storage";
import { listCandidates, VOICE_DEMO_TEXT, VOICE_PRESETS } from "@/lib/services/voices";
import { VoiceStudio } from "@/components/admin/VoiceStudio";

export default async function AdminVoicePage() {
  const storage = getStorage();
  const candidates = await Promise.all(
    (await listCandidates()).map(async (c) => ({
      id: c.id,
      source: c.source,
      name: c.name,
      description: c.description,
      voiceId: c.voice_id,
      designed: Boolean(c.generated_voice_id),
      previewUrl: c.preview_path ? await storage.signedUrl(c.preview_path, 6 * 3600) : null,
      createdAt: c.created_at,
    })),
  );
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Głos Elofika</h1>
        <p className="mt-2 text-muted">
          Zaprojektuj kilku kandydatów (ElevenLabs Voice Design), odsłuchaj, jak każdy czyta krótkie demo w roli Elofika, i ustaw wiodący głos. Wybór działa od razu: nowe bajki, powitania i próbki nagrają się nowym głosem (stare nagrania zostają w cache).
        </p>
      </div>
      <VoiceStudio
        initial={candidates}
        presets={VOICE_PRESETS}
        demoText={VOICE_DEMO_TEXT}
        current={{ voiceId: config.elevenlabs.voiceId || null, version: config.elevenlabs.voiceVersion }}
        keyConfigured={Boolean(config.elevenlabs.apiKey)}
        realTts={hasElevenLabs()}
      />
    </div>
  );
}
