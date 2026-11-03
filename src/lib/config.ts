/**
 * Centralna konfiguracja środowiska. Wszystkie klucze API czytane są wyłącznie po stronie serwera.
 * Kanoniczny adres produkcyjny: https://elofik.com — w dev/staging adres pochodzi z APP_URL.
 */
import "server-only";
import { getOverride } from "@/lib/settings/overrides";

function bool(v: string | undefined, fallback = false) {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : fallback;
}

export type AppEnv = "development" | "test" | "staging" | "production";

const appEnv = (process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development")) as AppEnv;

export const config = {
  appEnv,
  appUrl: (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: process.env.SESSION_SECRET ?? "",
  // Bez Supabase dane (konta, zaszyfrowane klucze API, nagrania) są w plikach. Na Railway z dołączonym
  // Volume trafiają automatycznie na wolumen (RAILWAY_VOLUME_MOUNT_PATH) i przetrwają kolejne wdrożenia.
  dataDir: process.env.ELOFIK_DATA_DIR ?? (process.env.RAILWAY_VOLUME_MOUNT_PATH ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH.replace(/\/$/, "")}/elofik` : ".data"),

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    audioBucket: process.env.SUPABASE_AUDIO_BUCKET ?? "audio",
    imageBucket: process.env.SUPABASE_IMAGE_BUCKET ?? "images",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    pricePremiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    priceGiftMonth: process.env.STRIPE_PRICE_GIFT_MONTH ?? "",
    couponReferralMonth: process.env.STRIPE_COUPON_REFERRAL_MONTH ?? "",
  },
  elevenlabs: {
    // wartość z panelu admina (Ustawienia → Klucze API) ma pierwszeństwo przed zmienną środowiskową
    get apiKey() {
      return getOverride("elevenlabs_api_key") ?? process.env.ELEVENLABS_API_KEY ?? "";
    },
    get voiceId() {
      return getOverride("elevenlabs_voice_id") ?? process.env.ELEVENLABS_VOICE_ID ?? "";
    },
    // ustawiana automatycznie przy wyborze głosu w Admin → Głos Elofika (nowy głos = nowe klucze cache)
    get voiceVersion() {
      return getOverride("elevenlabs_voice_version") ?? process.env.ELEVENLABS_VOICE_VERSION ?? "VOICE_V1";
    },
    ttsModel: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_multilingual_v2",
    outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128",
    sttModel: "scribe_v2_realtime",
    /** USD za 1000 znaków TTS (do estymacji kosztów). */
    ttsUsdPer1kChars: num(process.env.ELEVENLABS_TTS_USD_PER_1K_CHARS, 0.18),
    /** USD za minutę Scribe Realtime. */
    sttUsdPerMinute: num(process.env.ELEVENLABS_STT_USD_PER_MINUTE, 0.0067),
  },
  openai: {
    get apiKey() {
      return getOverride("openai_api_key") ?? process.env.OPENAI_API_KEY ?? "";
    },
    textModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    // gpt-image-1 wyłączony 23.10.2026 — domyślnie gpt-image-2.5-sunburst (można zmienić w panelu)
    get imageModel() {
      return getOverride("openai_image_model") ?? process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst";
    },
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "Elofik <bajki@elofik.com>",
  },
  budget: {
    /** Miesięczny limit wszystkich płatnych wywołań AI (USD). 0 = brak płatnych wywołań. */
    get monthlyUsd() {
      return num(getOverride("ai_monthly_budget_usd") ?? process.env.AI_MONTHLY_BUDGET_USD, 0);
    },
    /** Dzienny limit kosztu próbek z landing page (USD). */
    sampleDailyUsd: num(process.env.AI_SAMPLE_DAILY_BUDGET_USD, 5),
  },
  voice: {
    sessionMaxSeconds: num(process.env.VOICE_SESSION_MAX_SECONDS, 8),
    maxAttemptsPerStory: num(process.env.VOICE_MAX_ATTEMPTS_PER_STORY, 4),
    maxSessionsPerFamilyPerDay: num(process.env.VOICE_MAX_SESSIONS_PER_DAY, 20),
  },
  unlockHour: num(process.env.UNLOCK_HOUR, 6),
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? "Europe/Warsaw",
  // odporne na wklejone cudzysłowy, spacje i średniki: "admin@elofik.com" → admin@elofik.com
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(/[,;\s]+/).map((s) => s.trim().replace(/^["'<]+|[">']+$/g, "").toLowerCase()).filter(Boolean),
  forceDemo: bool(process.env.ELOFIK_DEMO_MODE),
};

/** Tryb demo: brak Supabase lub wymuszony flagą. Dane w pamięci/pliku, dostawcy AI mockowani. */
export const isDemoMode = () => config.forceDemo || !config.supabase.url || !config.supabase.serviceRoleKey;
export const hasElevenLabs = () => Boolean(config.elevenlabs.apiKey && config.elevenlabs.voiceId);
export const hasOpenAI = () => Boolean(config.openai.apiKey);
export const hasStripe = () => Boolean(config.stripe.secretKey);

/** Czy pliki danych przetrwają wdrożenie: Supabase, wolumen Railway lub jawnie ustawiony katalog (lokalnie zawsze tak). */
export function dataStorageInfo(): { kind: "supabase" | "volume" | "local" | "ephemeral"; path: string | null } {
  if (!isDemoMode()) return { kind: "supabase", path: null };
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return { kind: "volume", path: config.dataDir };
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID) return { kind: "ephemeral", path: config.dataDir };
  return { kind: "local", path: config.dataDir };
}

export function absoluteUrl(path = "/") {
  return `${config.appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSessionSecret(): string {
  if (config.sessionSecret.length >= 32) return config.sessionSecret;
  if (config.appEnv === "production") throw new Error("SESSION_SECRET (min. 32 znaki) jest wymagany na produkcji");
  return "dev-only-insecure-session-secret-change-me";
}
