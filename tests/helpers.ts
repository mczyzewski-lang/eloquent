import { MemoryDb } from "@/lib/db/memory";
import { setDbForTests } from "@/lib/db";
import { setStorageForTests, type Storage } from "@/lib/storage";
import { setTtsForTests, MockTts } from "@/lib/audio/tts";

export class MemStorage implements Storage {
  files = new Map<string, Buffer>();
  async put(k: string, d: Buffer) {
    this.files.set(k, d);
  }
  async get(k: string) {
    return this.files.get(k) ?? null;
  }
  async exists(k: string) {
    return this.files.has(k);
  }
  async signedUrl(k: string) {
    return `/signed/${k}`;
  }
  async remove(keys: string[]) {
    keys.forEach((k) => this.files.delete(k));
  }
}

export function freshEnv() {
  const db = new MemoryDb();
  const storage = new MemStorage();
  const tts = new MockTts();
  setDbForTests(db);
  setStorageForTests(storage);
  setTtsForTests(tts);
  return { db, storage, tts };
}
