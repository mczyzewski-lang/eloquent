import path from "node:path";
import { config, isDemoMode } from "@/lib/config";
import { MemoryDb } from "./memory";
import { SupabaseDb } from "./supabase";
import type { Db } from "./types";

export * from "./types";

const g = globalThis as unknown as { __elofikDb?: Db };

export function getDb(): Db {
  if (!g.__elofikDb) {
    g.__elofikDb = isDemoMode()
      ? new MemoryDb({ file: path.join(process.cwd(), config.dataDir, "db.json") })
      : SupabaseDb.fromEnv(config.supabase.url, config.supabase.serviceRoleKey);
  }
  return g.__elofikDb;
}

/** Tylko testy: podmiana backendu. */
export function setDbForTests(db: Db) {
  g.__elofikDb = db;
}

export const nowIso = () => new Date().toISOString();
