import { getDb, nowIso } from "@/lib/db";

export const ANALYTICS_EVENTS = [
  // lejek rodziców
  "landing_viewed", "sample_name_submitted", "sample_played", "sample_completed", "onboarding_started", "onboarding_step_completed", "onboarding_completed",
  "account_created", "checkout_started", "subscription_started", "subscription_canceled",
  // lejek dziadków
  "grandparents_landing_viewed", "gift_free_created", "gift_shared", "gift_opened", "gift_purchase_started", "gift_purchased", "gift_activation_viewed", "gift_redeemed",
  // aplikacja
  "story_opened", "story_play_started", "story_completed", "story_favorited", "calendar_viewed",
  // rytuał
  "voice_greeting_screen_viewed", "voice_greeting_started", "voice_greeting_recognized", "voice_greeting_failed", "voice_greeting_skipped", "voice_greeting_response_played", "voice_greeting_to_story_started",
  // polecenia
  "referral_link_copied", "referral_signup", "referral_qualified",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

const ALLOWED = new Set<string>(ANALYTICS_EVENTS);

export function isAllowedEvent(name: string): name is AnalyticsEventName {
  return ALLOWED.has(name);
}

/** Zapis zdarzenia. Props są przycinane — nigdy nie zapisujemy treści wypowiedzi dziecka. */
export async function track(name: AnalyticsEventName, opts: { familyId?: string | null; anonId?: string | null; props?: Record<string, unknown> } = {}) {
  const props: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(opts.props ?? {}).slice(0, 20)) {
    if (/transcript|text|audio|email/i.test(k)) continue;
    if (typeof v === "string") props[k] = v.slice(0, 120);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) props[k] = v;
  }
  await getDb().insert("analytics_events", { name, family_id: opts.familyId ?? null, anon_id: opts.anonId ?? null, props, created_at: nowIso() });
}
