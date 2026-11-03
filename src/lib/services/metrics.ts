/** Metryki biznesowe i kosztowe dla panelu admina. */
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { PRICING } from "@/lib/domain/pricing";
import { estimateTtsUsd, estimateSttUsd } from "@/lib/domain/budget";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

const DAY = 86_400_000;

export async function businessMetrics(now = new Date()) {
  const db = getDb();
  const [users, families, subs, events, progress, gifts, giftEnt, referrals, payments] = await Promise.all([
    db.count("users"),
    db.find("families"),
    db.find("subscriptions"),
    db.find("analytics_events", { created_at: { gte: new Date(now.getTime() - 90 * DAY).toISOString() } }),
    db.find("listening_progress"),
    db.find("gift_purchases"),
    db.find("gift_entitlements"),
    db.find("referrals"),
    db.find("payments"),
  ]);
  const nowIso = now.toISOString();
  const activeSubs = subs.filter((s) => ["active", "trialing", "past_due"].includes(s.status) && (!s.current_period_end || s.current_period_end > nowIso));
  const paying = activeSubs.filter((s) => s.source === "stripe" || s.source === "demo");
  const since30 = new Date(now.getTime() - 30 * DAY).toISOString();
  const count = (name: string) => events.filter((e) => e.name === name).length;

  // retencja: odsetek rodzin aktywowanych ≥N dni temu, które słuchały w dniu N (±0) lub później
  const retention = (n: number) => {
    const eligible = families.filter((f) => f.activated_at && now.getTime() - new Date(f.activated_at).getTime() >= n * DAY);
    if (!eligible.length) return null;
    const retained = eligible.filter((f) =>
      progress.some((p) => p.family_id === f.id && p.last_played_at && new Date(p.last_played_at).getTime() - new Date(f.activated_at!).getTime() >= n * DAY - DAY / 2),
    );
    return retained.length / eligible.length;
  };

  const unlocks = await db.count("story_unlocks");
  const played = progress.filter((p) => p.play_count > 0).length;
  const completed = progress.filter((p) => p.completed).length;
  const voiceSessions = await db.find("voice_greeting_sessions");
  const recognized = voiceSessions.filter((v) => v.outcome === "recognized").length;
  const voiceAttempts = voiceSessions.filter((v) => v.outcome !== "skipped" && v.outcome !== "pending").length;

  return {
    accounts: users,
    families: families.length,
    activeSubscriptions: activeSubs.length,
    payingSubscriptions: paying.length,
    mrrGross: paying.filter((s) => !s.cancel_at_period_end).length * PRICING.premiumMonthlyGross,
    newSubscriptions30d: subs.filter((s) => s.created_at >= since30 && s.source !== "gift").length,
    cancellations30d: subs.filter((s) => (s.status === "canceled" || s.cancel_at_period_end) && s.updated_at >= since30).length,
    churnRate30d: activeSubs.length ? subs.filter((s) => s.status === "canceled" && s.updated_at >= since30).length / Math.max(1, activeSubs.length) : 0,
    paymentFailures30d: payments.filter((p) => p.status === "failed" && p.created_at >= since30).length,
    funnelParents: [
      ["Landing", count("landing_viewed")],
      ["Imię", count("sample_name_submitted")],
      ["Próbka", count("sample_played")],
      ["Onboarding", count("onboarding_completed")],
      ["Checkout", count("checkout_started")],
      ["Subskrypcja", count("subscription_started")],
    ] as [string, number][],
    funnelGrandparents: [
      ["Landing dziadków", count("grandparents_landing_viewed")],
      ["Prezent (darmowy)", count("gift_free_created")],
      ["Udostępnienie", count("gift_shared")],
      ["Otwarcie przez rodzinę", count("gift_opened")],
      ["Zakup prezentu", count("gift_purchased")],
      ["Aktywacja", count("gift_redeemed")],
    ] as [string, number][],
    retention: { d1: retention(1), d7: retention(7), d14: retention(14), d30: retention(30) },
    avgPlaysPerFamily: families.length ? progress.reduce((s, p) => s + p.play_count, 0) / families.length : 0,
    unlockedPlayedRate: unlocks ? played / unlocks : null,
    completionRate: played ? completed / played : null,
    voiceRecognitionRate: voiceAttempts ? recognized / voiceAttempts : null,
    voiceSkipped: voiceSessions.filter((v) => v.outcome === "skipped").length,
    giftShare: activeSubs.length ? giftEnt.filter((g) => g.ends_at > nowIso).length / (activeSubs.length + giftEnt.filter((g) => g.ends_at > nowIso).length) : 0,
    giftsPurchased: gifts.filter((g) => g.status !== "pending").length,
    giftsRedeemed: gifts.filter((g) => g.status === "redeemed").length,
    referralsQualified: referrals.filter((r) => r.status === "qualified").length,
    referralsRejected: referrals.filter((r) => r.status === "rejected").length,
  };
}

export async function costMetrics(now = new Date()) {
  await ensureRuntimeSettings();
  const db = getDb();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const logs = await db.find("ai_cost_logs", { created_at: { gte: monthStart } });
  const cache = await db.find("audio_cache");
  const sum = (f: (l: (typeof logs)[number]) => boolean) => logs.filter(f).reduce((s, l) => s + l.usd, 0);
  const units = (f: (l: (typeof logs)[number]) => boolean) => logs.filter(f).reduce((s, l) => s + l.units, 0);
  const ttsLogs = logs.filter((l) => l.provider === "elevenlabs_tts");
  const hits = ttsLogs.filter((l) => l.cache_hit).length;
  const voiceRecognized = await db.count("voice_greeting_sessions", { outcome: "recognized", started_at: { gte: monthStart } });

  const coreChars = cache.filter((c) => c.shared).reduce((s, c) => s + c.chars, 0);
  const personalChars = cache.filter((c) => !c.shared && c.segment_type !== "GREETING").reduce((s, c) => s + c.chars, 0);
  const greetingRows = cache.filter((c) => c.segment_type === "GREETING");
  const families = Math.max(1, await db.count("families"));
  const list = (chars: number) => estimateTtsUsd(chars, config.elevenlabs.ttsUsdPer1kChars);

  return {
    budgetMonthlyUsd: config.budget.monthlyUsd,
    spentMonthUsd: logs.reduce((s, l) => s + l.usd, 0),
    byProvider: {
      elevenlabsTts: sum((l) => l.provider === "elevenlabs_tts"),
      elevenlabsStt: sum((l) => l.provider === "elevenlabs_stt"),
      openaiText: sum((l) => l.provider === "openai_text"),
      openaiImage: sum((l) => l.provider === "openai_image"),
    },
    // szacunki wg cennika — działają też w trybie demo (mock TTS = 0 USD rzeczywistego kosztu)
    listPrice: {
      ttsCharsMonth: units((l) => l.provider === "elevenlabs_tts"),
      ttsUsdMonth: list(units((l) => l.provider === "elevenlabs_tts")),
      sttSecondsMonth: units((l) => l.provider === "elevenlabs_stt"),
      sttUsdMonth: estimateSttUsd(units((l) => l.provider === "elevenlabs_stt"), config.elevenlabs.sttUsdPerMinute),
      coreUsdTotal: list(coreChars),
      personalizationUsdTotal: list(personalChars),
      personalizationUsdPerFamily: list(personalChars) / families,
      firstGreetingUsd: greetingRows.length ? list(greetingRows.reduce((s, c) => s + c.chars, 0) / greetingRows.length) : 0,
      repeatListenUsd: 0,
      firstStoryForNewFamilyUsd: list(personalChars / families) + (greetingRows.length ? list(greetingRows[0].chars) : 0),
      sttPerSuccessfulGreetingUsd: voiceRecognized ? estimateSttUsd(units((l) => l.provider === "elevenlabs_stt"), config.elevenlabs.sttUsdPerMinute) / voiceRecognized : 0,
    },
    cacheHitRate: ttsLogs.length ? hits / ttsLogs.length : null,
    cacheEntries: cache.length,
    sharedEntries: cache.filter((c) => c.shared).length,
    byPurpose: Object.fromEntries(
      ["core", "personalization", "greeting", "sample", "gift_story", "voice_greeting", "script", "illustration", "preview"].map((p) => [p, sum((l) => l.purpose === p)]),
    ),
  };
}
