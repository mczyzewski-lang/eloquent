/**
 * Backend danych dla trybu demo/dev/testów: pamięć procesu + zapis do pliku JSON.
 * Nie używać na produkcji — brak współbieżności między procesami.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { matchesFilter } from "./filter";
import type { Db, Filter, FindOptions, GenerationJobRow, TableName, Tables } from "./types";

type Store = { [N in TableName]?: Tables[N][] };

export class MemoryDb implements Db {
  private data: Store = {};
  private file: string | null;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(opts: { file?: string | null } = {}) {
    this.file = opts.file ?? null;
    if (this.file && fs.existsSync(this.file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      } catch {
        this.data = {};
      }
    }
  }

  private table<N extends TableName>(name: N): Tables[N][] {
    return ((this.data[name] as Tables[N][] | undefined) ?? ((this.data[name] as Tables[N][]) = [] as Tables[N][])) as Tables[N][];
  }

  private persist() {
    if (!this.file) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      fs.mkdirSync(path.dirname(this.file!), { recursive: true });
      fs.writeFileSync(this.file!, JSON.stringify(this.data));
    }, 50);
  }

  flushSync() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data));
  }

  reset() {
    this.data = {};
    this.persist();
  }

  async find<N extends TableName>(table: N, filter?: Filter<Tables[N]>, opts?: FindOptions<Tables[N]>) {
    let rows = this.table(table).filter((r) => matchesFilter(r, filter));
    if (opts?.orderBy) {
      const { column, ascending = true } = opts.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[column] as unknown as string | number;
        const bv = b[column] as unknown as string | number;
        const c = av < bv ? -1 : av > bv ? 1 : 0;
        return ascending ? c : -c;
      });
    }
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return structuredClone(rows);
  }

  async findOne<N extends TableName>(table: N, filter: Filter<Tables[N]>) {
    const row = this.table(table).find((r) => matchesFilter(r, filter));
    return row ? structuredClone(row) : null;
  }

  async count<N extends TableName>(table: N, filter?: Filter<Tables[N]>) {
    return this.table(table).filter((r) => matchesFilter(r, filter)).length;
  }

  async insert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }) {
    const full = { ...row, id: row.id ?? randomUUID() } as Tables[N];
    if (this.table(table).some((r) => (r as { id: string }).id === (full as { id: string }).id)) throw new Error(`duplicate id in ${table}`);
    this.table(table).push(structuredClone(full));
    this.persist();
    return structuredClone(full);
  }

  async update<N extends TableName>(table: N, filter: Filter<Tables[N]>, patch: Partial<Tables[N]>) {
    const out: Tables[N][] = [];
    for (const r of this.table(table)) {
      if (matchesFilter(r, filter)) {
        Object.assign(r as object, structuredClone(patch));
        out.push(structuredClone(r));
      }
    }
    if (out.length) this.persist();
    return out;
  }

  async upsert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }, conflict: (keyof Tables[N] & string)[]) {
    const filter = Object.fromEntries(conflict.map((c) => [c, (row as Record<string, unknown>)[c]])) as Filter<Tables[N]>;
    const existing = this.table(table).find((r) => matchesFilter(r, filter));
    if (existing) {
      const { id: _ignored, ...rest } = row as { id?: string };
      Object.assign(existing as object, structuredClone(rest));
      this.persist();
      return structuredClone(existing);
    }
    return this.insert(table, row);
  }

  async delete<N extends TableName>(table: N, filter: Filter<Tables[N]>) {
    const before = this.table(table).length;
    this.data[table] = this.table(table).filter((r) => !matchesFilter(r, filter)) as never;
    const n = before - this.table(table).length;
    if (n) this.persist();
    return n;
  }

  async claimJob(workerId: string, types?: GenerationJobRow["type"][]) {
    const now = new Date().toISOString();
    const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    const jobs = this.table("generation_jobs")
      .filter((j) => (j.status === "queued" || (j.status === "running" && j.locked_at && j.locked_at < staleBefore)) && j.run_at <= now)
      .filter((j) => !types || types.includes(j.type))
      .sort((a, b) => a.run_at.localeCompare(b.run_at));
    const job = jobs[0];
    if (!job) return null;
    Object.assign(job, { status: "running", locked_at: now, locked_by: workerId, attempts: job.attempts + 1, updated_at: now });
    this.persist();
    return structuredClone(job);
  }

  async incrementCounter(key: string, windowStart: string) {
    const t = this.table("rate_limits");
    const row = t.find((r) => r.key === key && r.window_start === windowStart);
    if (row) {
      row.count += 1;
      this.persist();
      return row.count;
    }
    t.push({ id: randomUUID(), key, window_start: windowStart, count: 1 });
    // sprzątanie starych okien
    const cutoff = new Date(Date.now() - 2 * 86_400_000).toISOString();
    this.data.rate_limits = t.filter((r) => r.window_start >= cutoff);
    this.persist();
    return 1;
  }
}
