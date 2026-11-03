import { hasOpenAI } from "@/lib/config";
import { getDb } from "@/lib/db";
import { ensureProposedReference, IMAGE_COST_USD, listIllustrations } from "@/lib/services/illustrations";
import { illustrationView, referenceView } from "@/lib/services/illustration-views";
import { MASCOT_POSES, TEST_SCENES, PROMPT_VERSION } from "@/lib/ai/elofik-bible";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";
import { IllustrationStudio } from "@/components/admin/IllustrationStudio";
import type { IllustrationView } from "@/components/admin/IllustrationCard";

export default async function AdminIllustrationsPage() {
  await ensureRuntimeSettings();
  await ensureProposedReference();
  const refs = await getDb().find("reference_assets", {}, { orderBy: { column: "created_at", ascending: false } });
  const ills = await listIllustrations();
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Ilustracje Elofika</h1>
        <p className="mt-2 text-muted">
          Zawsze ten sam Elofik — inne przygody, miejsca i emocje. Każda ilustracja = kanoniczny opis postaci i stylu (prompt v{PROMPT_VERSION}) + zatwierdzona referencja + zmienna scena. Nic nie trafia do serwisu bez akceptacji. Okładki i ilustracje konkretnych bajek generujesz w CMS przy bajce (sekcja „Ilustracje”).
        </p>
      </div>
      <IllustrationStudio
        references={await Promise.all(refs.map(referenceView))}
        illustrations={(await Promise.all(ills.map(illustrationView))) as IllustrationView[]}
        mascotPoses={Object.entries(MASCOT_POSES).map(([slot, p]) => ({ slot, label: p.label, scene: p.scene }))}
        testScenes={TEST_SCENES}
        costs={IMAGE_COST_USD}
        openaiReady={hasOpenAI()}
      />
    </div>
  );
}
