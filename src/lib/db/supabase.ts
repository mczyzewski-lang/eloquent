/**
 * Backend produkcyjny: Supabase PostgreSQL przez service-role (tylko serwer).
 * Autoryzacja na poziomie aplikacji (familyId z sesji) + RLS jako druga linia obrony.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Db, Filter, FindOptions, GenerationJobRow, TableName, Tables } from "./types";

type Query = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

function applyFilter(q: Query, filter?: Record<string, unknown>): Query {
  if (!filter) return q;
  for (const [col, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;
    if (cond === null) q = q.is(col, null);
    else if (typeof cond === "object" && !Array.isArray(cond)) {
      const c = cond as Record<string, unknown>;
      if (c.gte !== undefined) q = q.gte(col, c.gte);
      if (c.gt !== undefined) q = q.gt(col, c.gt);
      if (c.lte !== undefined) q = q.lte(col, c.lte);
      if (c.lt !== undefined) q = q.lt(col, c.lt);
      if (c.in !== undefined) q = q.in(col, c.in as unknown[]);
      if ("neq" in c) q = c.neq === null ? q.not(col, "is", null) : q.neq(col, c.neq);
      if (!["gte", "gt", "lte", "lt", "in", "neq"].some((k) => k in c)) q = q.eq(col, cond);
    } else q = q.eq(col, cond);
  }
  return q;
}

export class SupabaseDb implements Db {
  constructor(private client: SupabaseClient) {}

  static fromEnv(url: string, serviceRoleKey: string) {
    return new SupabaseDb(createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }));
  }

  async find<N extends TableName>(table: N, filter?: Filter<Tables[N]>, opts?: FindOptions<Tables[N]>) {
    let q = applyFilter(this.client.from(table).select("*"), filter as Record<string, unknown>);
    if (opts?.orderBy) q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? true });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`[db] ${table}.find: ${error.message}`);
    return (data ?? []) as Tables[N][];
  }

  async findOne<N extends TableName>(table: N, filter: Filter<Tables[N]>) {
    const rows = await this.find(table, filter, { limit: 1 });
    return rows[0] ?? null;
  }

  async count<N extends TableName>(table: N, filter?: Filter<Tables[N]>) {
    const q = applyFilter(this.client.from(table).select("*", { count: "exact", head: true }), filter as Record<string, unknown>);
    const { count, error } = await q;
    if (error) throw new Error(`[db] ${table}.count: ${error.message}`);
    return count ?? 0;
  }

  async insert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }) {
    const { data, error } = await this.client.from(table).insert(row as never).select("*").single();
    if (error) throw new Error(`[db] ${table}.insert: ${error.message}`);
    return data as Tables[N];
  }

  async update<N extends TableName>(table: N, filter: Filter<Tables[N]>, patch: Partial<Tables[N]>) {
    let q = this.client.from(table).update(patch as never) as unknown as Query;
    q = applyFilter(q, filter as Record<string, unknown>);
    const { data, error } = await (q as unknown as Query).select("*");
    if (error) throw new Error(`[db] ${table}.update: ${error.message}`);
    return (data ?? []) as Tables[N][];
  }

  async upsert<N extends TableName>(table: N, row: Omit<Tables[N], "id"> & { id?: string }, conflict: (keyof Tables[N] & string)[]) {
    const { data, error } = await this.client.from(table).upsert(row as never, { onConflict: conflict.join(",") }).select("*").single();
    if (error) throw new Error(`[db] ${table}.upsert: ${error.message}`);
    return data as Tables[N];
  }

  async delete<N extends TableName>(table: N, filter: Filter<Tables[N]>) {
    let q = this.client.from(table).delete({ count: "exact" }) as unknown as Query;
    q = applyFilter(q, filter as Record<string, unknown>);
    const { count, error } = await q;
    if (error) throw new Error(`[db] ${table}.delete: ${error.message}`);
    return count ?? 0;
  }

  async claimJob(workerId: string, types?: GenerationJobRow["type"][]) {
    const { data, error } = await this.client.rpc("claim_generation_job", { p_worker: workerId, p_types: types ?? null });
    if (error) throw new Error(`[db] claim_generation_job: ${error.message}`);
    const rows = (data ?? []) as GenerationJobRow[];
    return rows[0] ?? null;
  }

  async incrementCounter(key: string, windowStart: string) {
    const { data, error } = await this.client.rpc("increment_rate_limit", { p_key: key, p_window: windowStart });
    if (error) throw new Error(`[db] increment_rate_limit: ${error.message}`);
    return Number(data ?? 0);
  }
}
