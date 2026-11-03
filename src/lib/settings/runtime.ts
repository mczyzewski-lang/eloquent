/**
 * Ustawienia zarządzane w panelu admina (Ustawienia → Klucze API).
 * Zapis: zaszyfrowane w tabeli app_settings. Odczyt: cache w pamięci (TTL), wartość z panelu
 * ma pierwszeństwo przed zmienną środowiskową. Do przeglądarki trafia wyłącznie maska.
 */
import { getSessionSecret } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";
import { setOverrides, type RuntimeSettingKey } from "./overrides";

export interface SettingMeta {
  key: RuntimeSettingKey;
  label: string;
  secret: boolean;
  envVar: string;
  help: string;
  placeholder: string;
}

export const SETTINGS: SettingMeta[] = [
  { key: "elevenlabs_api_key", label: "ElevenLabs — klucz API", secret: true, envVar: "ELEVENLABS_API_KEY", help: "ElevenLabs → Developers → API Keys. Uprawnienia: Text to Speech, Speech to Text, Voices (odczyt), User (odczyt).", placeholder: "sk_…" },
  { key: "elevenlabs_voice_id", label: "ElevenLabs — Voice ID głosu Elofika", secret: false, envVar: "ELEVENLABS_VOICE_ID", help: "ElevenLabs → Voices → wybrany głos → „Copy voice ID”.", placeholder: "np. 21m00Tcm4TlvDq8ikWAM" },
  { key: "openai_api_key", label: "OpenAI — klucz API", secret: true, envVar: "OPENAI_API_KEY", help: "platform.openai.com → API keys. Używany do scenariuszy i ilustracji (bez danych dzieci).", placeholder: "sk-…" },
  { key: "openai_image_model", label: "OpenAI — model ilustracji", secret: false, envVar: "OPENAI_IMAGE_MODEL", help: "Domyślnie gpt-image-2.5-sunburst (gpt-image-1 został wyłączony 23.10.2026). Alternatywa: gpt-image-2.5-flare.", placeholder: "gpt-image-2.5-sunburst" },
  { key: "ai_monthly_budget_usd", label: "Miesięczny budżet AI (USD)", secret: false, envVar: "AI_MONTHLY_BUDGET_USD", help: "Bez budżetu > 0 płatne generowanie (TTS, Scribe, OpenAI) jest zablokowane, nawet z kluczami.", placeholder: "np. 20" },
];

const TTL_MS = 30_000;
const g = globalThis as unknown as { __elofikSettingsLoadedAt?: number; __elofikSettingsLoading?: Promise<void> };

/** Ładuje ustawienia z bazy do pamięci (cache 30 s). Wywoływane przed każdą operacją używającą kluczy. */
export async function ensureRuntimeSettings(force = false): Promise<void> {
  if (!force && g.__elofikSettingsLoadedAt && Date.now() - g.__elofikSettingsLoadedAt < TTL_MS) return;
  if (!force && g.__elofikSettingsLoading) return g.__elofikSettingsLoading;
  g.__elofikSettingsLoading = (async () => {
    try {
      const rows = await getDb().find("app_settings");
      const secret = getSessionSecret();
      const values: Partial<Record<RuntimeSettingKey, string>> = {};
      for (const r of rows) {
        const meta = SETTINGS.find((s) => s.key === r.key);
        const plain = meta ? decryptSecret(r.value_encrypted, secret) : null;
        if (meta && plain) values[meta.key] = plain;
      }
      setOverrides(values);
      g.__elofikSettingsLoadedAt = Date.now();
    } catch (e) {
      // brak tabeli (migracja niezastosowana) lub chwilowy błąd bazy — zostają zmienne środowiskowe
      console.warn("[settings] nie udało się wczytać ustawień:", (e as Error).message);
      g.__elofikSettingsLoadedAt = Date.now();
    } finally {
      g.__elofikSettingsLoading = undefined;
    }
  })();
  return g.__elofikSettingsLoading;
}

export function validateSetting(key: RuntimeSettingKey, value: string): string | null {
  const v = value.trim();
  if (v.length > 300) return "Wartość jest za długa.";
  if (/\s/.test(v)) return "Wartość nie może zawierać spacji.";
  if (key === "ai_monthly_budget_usd") {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100_000) return "Podaj kwotę od 0 do 100000.";
  }
  if (key === "openai_api_key" && !/^sk-[A-Za-z0-9_-]{20,}$/.test(v)) return "Klucz OpenAI zaczyna się od „sk-”.";
  if (key === "elevenlabs_api_key" && !/^[A-Za-z0-9_-]{20,}$/.test(v)) return "To nie wygląda na klucz ElevenLabs.";
  if (key === "openai_image_model" && !/^(gpt-image|chatgpt-image)[a-z0-9.-]*$/.test(v)) return "Podaj nazwę modelu obrazów OpenAI, np. gpt-image-2.5-sunburst.";
  if (key === "elevenlabs_voice_id" && !/^[A-Za-z0-9]{10,40}$/.test(v)) return "Voice ID składa się z liter i cyfr (ok. 20 znaków).";
  return null;
}

/** Zapis (wartość pusta = usunięcie, wtedy wraca zmienna środowiskowa). */
export async function saveSetting(key: RuntimeSettingKey, value: string, actorEmail: string) {
  const db = getDb();
  const v = value.trim();
  if (!v) await db.delete("app_settings", { key });
  else await db.upsert("app_settings", { key, value_encrypted: encryptSecret(v, getSessionSecret()), updated_by: actorEmail, updated_at: nowIso() }, ["key"]);
  await ensureRuntimeSettings(true);
}

export interface SettingView {
  key: RuntimeSettingKey;
  label: string;
  help: string;
  placeholder: string;
  secret: boolean;
  source: "panel" | "env" | "none";
  /** Maska sekretu albo jawna wartość ustawienia niejawnego. */
  display: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** Widok dla panelu — sekrety wyłącznie zamaskowane. */
export async function describeSettings(): Promise<SettingView[]> {
  await ensureRuntimeSettings(true);
  const rows = await getDb().find("app_settings").catch(() => []);
  const secret = getSessionSecret();
  return SETTINGS.map((m) => {
    const row = rows.find((r) => r.key === m.key);
    const panel = row ? decryptSecret(row.value_encrypted, secret) : null;
    const env = process.env[m.envVar] ?? "";
    const value = panel ?? (env || null);
    return {
      key: m.key,
      label: m.label,
      help: m.help,
      placeholder: m.placeholder,
      secret: m.secret,
      source: panel ? "panel" : env ? "env" : "none",
      display: value ? (m.secret ? maskSecret(value) : value) : null,
      updatedBy: panel ? row!.updated_by : null,
      updatedAt: panel ? row!.updated_at : null,
    };
  });
}
