/**
 * Wartości ustawień zapisane w panelu admina, trzymane w pamięci procesu.
 * Moduł bez zależności (czyta go config.ts) — wypełnia go `ensureRuntimeSettings()`.
 */
export type RuntimeSettingKey =
  | "elevenlabs_api_key"
  | "elevenlabs_voice_id"
  | "openai_api_key"
  | "openai_image_model"
  | "elevenlabs_voice_version"
  | "elevenlabs_tts_model"
  | "ai_monthly_budget_usd"
  | "smsapi_token"
  | "sms_sender";

const g = globalThis as unknown as { __elofikOverrides?: Partial<Record<RuntimeSettingKey, string>> };

export function getOverride(key: RuntimeSettingKey): string | undefined {
  const v = g.__elofikOverrides?.[key];
  return v ? v : undefined;
}

export function setOverrides(values: Partial<Record<RuntimeSettingKey, string>>) {
  g.__elofikOverrides = { ...values };
}
