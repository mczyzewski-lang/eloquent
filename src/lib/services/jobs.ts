/**
 * Trwała kolejka zadań w PostgreSQL (tabela generation_jobs, claim przez FOR UPDATE SKIP LOCKED).
 * Worker (worker/index.ts) na Railway przetwarza render bajek, powitań, CORE, ilustracji i e-maile.
 */
import { isDemoMode } from "@/lib/config";
import { getDb, nowIso, type GenerationJobRow } from "@/lib/db";

export async function enqueueJob(type: GenerationJobRow["type"], payload: Record<string, unknown>, opts: { dedupeKey?: string; runAt?: Date; maxAttempts?: number } = {}) {
  const db = getDb();
  if (opts.dedupeKey) {
    const existing = await db.findOne("generation_jobs", { dedupe_key: opts.dedupeKey, status: { in: ["queued", "running"] } });
    if (existing) return existing;
  }
  const job = await db.insert("generation_jobs", {
    type,
    payload,
    status: "queued",
    attempts: 0,
    max_attempts: opts.maxAttempts ?? 3,
    run_at: (opts.runAt ?? new Date()).toISOString(),
    locked_at: null,
    locked_by: null,
    error: null,
    dedupe_key: opts.dedupeKey ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  // W trybie demo nie ma osobnego workera — przetwarzamy w tle w tym samym procesie.
  if (isDemoMode() && process.env.NODE_ENV !== "test") setTimeout(() => void runPendingJobs("inline").catch(() => undefined), 10);
  return job;
}

type Handler = (payload: Record<string, unknown>) => Promise<void>;
const handlers: Partial<Record<GenerationJobRow["type"], Handler>> = {};

export function registerJobHandler(type: GenerationJobRow["type"], handler: Handler) {
  handlers[type] = handler;
}

export async function processOne(workerId: string): Promise<GenerationJobRow | null> {
  await import("./job-handlers");
  const db = getDb();
  const job = await db.claimJob(workerId);
  if (!job) return null;
  const handler = handlers[job.type];
  try {
    if (!handler) throw new Error(`Brak handlera dla ${job.type}`);
    await handler(job.payload);
    await db.update("generation_jobs", { id: job.id }, { status: "done", error: null, updated_at: nowIso() });
  } catch (e) {
    const failed = job.attempts >= job.max_attempts;
    const backoff = new Date(Date.now() + 30_000 * 2 ** job.attempts);
    await db.update("generation_jobs", { id: job.id }, { status: failed ? "failed" : "queued", error: String((e as Error).message).slice(0, 1000), run_at: backoff.toISOString(), locked_at: null, updated_at: nowIso() });
  }
  return job;
}

export async function runPendingJobs(workerId: string, max = 20) {
  let n = 0;
  while (n < max && (await processOne(workerId))) n++;
  return n;
}
