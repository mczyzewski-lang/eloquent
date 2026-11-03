import { describeSettings } from "@/lib/settings/runtime";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { config, dataStorageInfo } from "@/lib/config";

export default async function AdminSettingsPage() {
  const settings = await describeSettings();
  const insecureSecret = config.sessionSecret.length < 32;
  const storage = dataStorageInfo();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Ustawienia i klucze API</h1>
        <p className="mt-2 text-muted">
          Wpisz klucze ElevenLabs i OpenAI, Voice ID głosu Elofika oraz miesięczny budżet AI. Klucze są szyfrowane (AES-256-GCM) i przechowywane wyłącznie na serwerze — po zapisaniu zobaczysz tylko ich zamaskowaną końcówkę. Wartość z panelu ma pierwszeństwo przed zmienną środowiskową; wyczyszczenie pola przywraca wartość ze zmiennej.
        </p>
      </div>
      {insecureSecret && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          <strong>Uwaga:</strong> nie ustawiono <code>SESSION_SECRET</code> (min. 32 znaki). Klucze zostaną zaszyfrowane domyślnym kluczem deweloperskim — przed zapisaniem prawdziwych kluczy ustaw <code>SESSION_SECRET</code> i uruchom aplikację ponownie.
        </p>
      )}
      {storage.kind === "ephemeral" && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800" data-testid="storage-ephemeral">
          <p className="font-semibold">Klucze zapiszą się, ale znikną przy następnym wdrożeniu na Railway.</p>
          <p className="mt-1">
            Aplikacja działa bez Supabase, więc trzyma dane w pliku w kontenerze, który Railway czyści przy każdym wdrożeniu. Rozwiązanie (2 min): Railway → serwis aplikacji → <strong>Settings → Volumes → Add Volume</strong> (np. mount path <code>/data</code>) → Deploy. Aplikacja sama wykryje wolumen i zacznie trzymać na nim dane. Dopiero potem wpisz klucze.
          </p>
          <p className="mt-1">Alternatywa: wpisz klucze jako zmienne w Railway → Variables (<code>ELEVENLABS_API_KEY</code>, <code>ELEVENLABS_VOICE_ID</code>, <code>OPENAI_API_KEY</code>, <code>AI_MONTHLY_BUDGET_USD</code>) — te zawsze przetrwają.</p>
        </div>
      )}
      {storage.kind === "volume" && (
        <p className="rounded-2xl bg-sage/20 p-4 text-sm text-sage-deep" data-testid="storage-volume">
          Zapis trwały: dane i zaszyfrowane klucze są na wolumenie Railway (<code>{storage.path}</code>) i przetrwają kolejne wdrożenia.
        </p>
      )}
      <p className="rounded-2xl bg-white p-4 text-sm text-muted">Po zapisaniu kluczy i budżetu Elofik od razu używa prawdziwego głosu ElevenLabs, Scribe i OpenAI — to generuje koszty w ramach ustawionego budżetu.</p>
      <SettingsForm initial={settings} />
    </div>
  );
}
