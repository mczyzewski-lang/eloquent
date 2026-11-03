/**
 * Centralna konfiguracja środowiska. Wszystkie klucze API czytane są wyłącznie po stronie serwera.
 * Kanoniczny adres produkcyjny: https://elofik.com — w dev/staging adres pochodzi z APP_URL.
 */
import "server-only";

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
  dataDir: process.env.ELOFIK_DATA_DIR ?? ".data",

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
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    voiceVersion: process.env.ELEVENLABS_VOICE_VERSION ?? "VOICE_V1",
    ttsModel: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_multilingual_v2",
    outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128",
    sttModel: "scribe_v2_realtime",
    /** USD za 1000 znaków TTS (do estymacji kosztów). */
    ttsUsdPer1kChars: num(process.env.ELEVENLABS_TTS_USD_PER_1K_CHARS, 0.18),
    /** USD za minutę Scribe Realtime. */
    sttUsdPerMinute: num(process.env.ELEVENLABS_STT_USD_PER_MINUTE, 0.0067),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    textModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
    imageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "Elofik <bajki@elofik.com>",
  },
  budget: {
    /** Miesięczny limit wszystkich płatnych wywołań AI (USD). 0 = brak płatnych wywołań. */
    monthlyUsd: num(process.env.AI_MONTHLY_BUDGET_USD, 0),
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
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  forceDemo: bool(process.env.ELOFIK_DEMO_MODE),
} as const;

/** Tryb demo: brak Supabase lub wymuszony flagą. Dane w pamięci/pliku, dostawcy AI mockowani. */
export const isDemoMode = () => config.forceDemo || !config.supabase.url || !config.supabase.serviceRoleKey;
export const hasElevenLabs = () => Boolean(config.elevenlabs.apiKey && config.elevenlabs.voiceId);
export const hasOpenAI = () => Boolean(config.openai.apiKey);
export const hasStripe = () => Boolean(config.stripe.secretKey);

export function absoluteUrl(path = "/") {
  return `${config.appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSessionSecret(): string {
  if (config.sessionSecret.length >= 32) return config.sessionSecret;
  if (config.appEnv === "production") throw new Error("SESSION_SECRET (min. 32 znaki) jest wymagany na produkcji");
  return "dev-only-insecure-session-secret-change-me";
}
