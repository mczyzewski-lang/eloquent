import { config } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import { checkBudget, type CostProvider, type CostPurpose } from "@/lib/domain/budget";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export class BudgetExceededError extends Error {
  constructor(public reason: string) {
    super(`Przekroczony lub nieskonfigurowany budżet AI (${reason})`);
  }
}

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
function dayStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export async function spentSince(sinceIso: string, purposes?: CostPurpose[]): Promise<number> {
  const rows = await getDb().find("ai_cost_logs", { created_at: { gte: sinceIso }, ...(purposes ? { purpose: { in: purposes } } : {}) });
  return rows.reduce((s, r) => s + r.usd, 0);
}

/** Rzuca BudgetExceededError, gdy płatna operacja przekroczyłaby limit. */
export async function assertBudget(purpose: CostPurpose, estimatedUsd: number) {
  await ensureRuntimeSettings();
  const [month, samplesToday] = await Promise.all([spentSince(monthStart()), spentSince(dayStart(), ["sample", "gift_story"])]);
  const res = checkBudget({
    monthlyLimitUsd: config.budget.monthlyUsd,
    spentThisMonthUsd: month,
    estimatedUsd,
    purpose,
    sampleDailyLimitUsd: config.budget.sampleDailyUsd,
    sampleSpentTodayUsd: samplesToday,
  });
  if (!res.allowed) throw new BudgetExceededError(res.reason ?? "unknown");
}

export async function recordCost(e: {
  provider: CostProvider;
  purpose: CostPurpose;
  usd: number;
  units: number;
  cacheHit?: boolean;
  familyId?: string | null;
  storyId?: string | null;
}) {
  await getDb().insert("ai_cost_logs", {
    provider: e.provider,
    purpose: e.purpose,
    usd: e.usd,
    units: e.units,
    cache_hit: e.cacheHit ?? false,
    family_id: e.familyId ?? null,
    story_id: e.storyId ?? null,
    created_at: nowIso(),
  });
}
