/**
 * Prywatne przechowywanie plików audio/obrazów.
 * - Supabase Storage (prywatny bucket, podpisane URL-e z krótkim TTL) — produkcja
 * - System plików (.data/storage) + podpisane URL-e /api/media — demo/dev
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config, getSessionSecret, isDemoMode } from "@/lib/config";
import { sign, unsign } from "@/lib/domain/tokens";

export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  /** URL ważny przez `ttlSeconds`. */
  signedUrl(key: string, ttlSeconds?: number): Promise<string>;
  remove(keys: string[]): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/i;
function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Niedozwolony klucz storage: ${key}`);
}

class LocalStorage implements Storage {
  constructor(private root: string) {}
  private p(key: string) {
    assertKey(key);
    return path.join(this.root, key);
  }
  async put(key: string, data: Buffer) {
    const file = this.p(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.p(key));
    } catch {
      return null;
    }
  }
  async exists(key: string) {
    try {
      await fs.access(this.p(key));
      return true;
    } catch {
      return false;
    }
  }
  async signedUrl(key: string, ttlSeconds = 3600) {
    assertKey(key);
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const token = sign(`${key}|${exp}`, getSessionSecret());
    return `/api/media?t=${encodeURIComponent(token)}`;
  }
  async remove(keys: string[]) {
    await Promise.all(keys.map((k) => fs.rm(this.p(k), { force: true })));
  }
}

/** Weryfikuje token /api/media → klucz storage lub null. */
export function verifyMediaToken(token: string): string | null {
  const value = unsign(token, getSessionSecret());
  if (!value) return null;
  const [key, exp] = value.split("|");
  if (!key || !exp || Number(exp) < Date.now() / 1000) return null;
  return key;
}

class SupabaseStorage implements Storage {
  private client = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });
  constructor(private bucket: string) {}
  async put(key: string, data: Buffer, contentType: string) {
    assertKey(key);
    const { error } = await this.client.storage.from(this.bucket).upload(key, data, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) throw new Error(`[storage] upload ${key}: ${error.message}`);
  }
  async get(key: string) {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  async exists(key: string) {
    const dir = path.posix.dirname(key);
    const name = path.posix.basename(key);
    const { data } = await this.client.storage.from(this.bucket).list(dir === "." ? "" : dir, { search: name, limit: 1 });
    return Boolean(data?.some((f) => f.name === name));
  }
  async signedUrl(key: string, ttlSeconds = 3600) {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(key, ttlSeconds);
    if (error || !data) throw new Error(`[storage] signedUrl ${key}: ${error?.message}`);
    return data.signedUrl;
  }
  async remove(keys: string[]) {
    if (keys.length) await this.client.storage.from(this.bucket).remove(keys);
  }
}

const g = globalThis as unknown as { __elofikStorage?: Storage };
export function getStorage(): Storage {
  if (!g.__elofikStorage) {
    g.__elofikStorage = isDemoMode()
      ? new LocalStorage(path.join(process.cwd(), config.dataDir, "storage"))
      : new SupabaseStorage(config.supabase.audioBucket);
  }
  return g.__elofikStorage;
}
export function setStorageForTests(s: Storage) {
  g.__elofikStorage = s;
}
