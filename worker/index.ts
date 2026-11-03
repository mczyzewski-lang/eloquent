/**
 * Worker Elofika (Railway, osobny serwis): przetwarza trwałą kolejkę generation_jobs.
 * Uruchomienie: `npm run worker`. Wymaga tych samych zmiennych środowiskowych co aplikacja.
 */
import { randomUUID } from "node:crypto";
import { processOne } from "@/lib/services/jobs";

const WORKER_ID = `worker-${process.env.RAILWAY_REPLICA_ID ?? randomUUID().slice(0, 8)}`;
const IDLE_MS = Number(process.env.WORKER_IDLE_MS ?? 3000);
let running = true;

process.on("SIGTERM", () => {
  console.info(`[${WORKER_ID}] SIGTERM — kończę bieżące zadanie`);
  running = false;
});
process.on("SIGINT", () => (running = false));

async function main() {
  console.info(`[${WORKER_ID}] start`);
  while (running) {
    try {
      const job = await processOne(WORKER_ID);
      if (job) console.info(`[${WORKER_ID}] ${job.type} ${job.id} (próba ${job.attempts})`);
      else await new Promise((r) => setTimeout(r, IDLE_MS));
    } catch (e) {
      console.error(`[${WORKER_ID}] błąd pętli`, e);
      await new Promise((r) => setTimeout(r, IDLE_MS * 3));
    }
  }
  console.info(`[${WORKER_ID}] stop`);
}

void main();
