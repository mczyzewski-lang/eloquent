/** Kontrola budżetu płatnych operacji AI. */
export type CostProvider = "elevenlabs_tts" | "elevenlabs_stt" | "openai_text" | "openai_image";
export type CostPurpose =
  | "core"
  | "personalization"
  | "greeting"
  | "sample"
  | "gift_story"
  | "voice_greeting"
  | "script"
  | "illustration"
  | "preview";

export interface BudgetCheck {
  allowed: boolean;
  remainingUsd: number;
  reason?: "no_budget_configured" | "monthly_limit" | "sample_daily_limit";
}

export function checkBudget(opts: {
  monthlyLimitUsd: number;
  spentThisMonthUsd: number;
  estimatedUsd: number;
  purpose: CostPurpose;
  sampleDailyLimitUsd?: number;
  sampleSpentTodayUsd?: number;
}): BudgetCheck {
  if (opts.monthlyLimitUsd <= 0) return { allowed: false, remainingUsd: 0, reason: "no_budget_configured" };
  const remaining = opts.monthlyLimitUsd - opts.spentThisMonthUsd;
  if (opts.estimatedUsd > remaining) return { allowed: false, remainingUsd: Math.max(0, remaining), reason: "monthly_limit" };
  if ((opts.purpose === "sample" || opts.purpose === "gift_story") && opts.sampleDailyLimitUsd !== undefined) {
    if ((opts.sampleSpentTodayUsd ?? 0) + opts.estimatedUsd > opts.sampleDailyLimitUsd)
      return { allowed: false, remainingUsd: remaining, reason: "sample_daily_limit" };
  }
  return { allowed: true, remainingUsd: remaining - opts.estimatedUsd };
}

export function estimateTtsUsd(chars: number, usdPer1k: number): number {
  return (chars / 1000) * usdPer1k;
}

export function estimateSttUsd(seconds: number, usdPerMinute: number): number {
  return (seconds / 60) * usdPerMinute;
}
