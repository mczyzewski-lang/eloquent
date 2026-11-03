import { describeSettings } from "@/lib/settings/runtime";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { config, isDemoMode } from "@/lib/config";

export default async function AdminSettingsPage() {
  const settings = await describeSettings();
  const insecureSecret = config.sessionSecret.length < 32;
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
      {isDemoMode() && (
        <p className="rounded-2xl bg-peach p-4 text-sm text-navy">
          Tryb demo: dane (w tym zaszyfrowane klucze) są w pliku <code>.data/db.json</code> na tym komputerze. Po dodaniu kluczy i budżetu Elofik zacznie używać prawdziwego głosu i Scribe — to generuje koszty.
        </p>
      )}
      <SettingsForm initial={settings} />
    </div>
  );
}
