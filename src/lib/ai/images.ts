/**
 * Ilustracje (OpenAI Images API). Jedna grafika na bajkę — nigdy osobno dla imienia dziecka.
 *
 * Spójność postaci: każda okładka powstaje przez `images.edit` z dołączonym arkuszem
 * referencyjnym Elofika (public/brand/elofik-reference.png, renderowanym z kodu maskotki)
 * oraz stałym opisem postaci. Dzięki temu model odwzorowuje istniejącego bohatera,
 * zamiast za każdym razem wymyślać nowego elfa.
 */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { config, hasOpenAI } from "@/lib/config";
import { getStorage } from "@/lib/storage";
import { sha256 } from "@/lib/domain/hash";
import { getDb, nowIso } from "@/lib/db";
import { illustrationPrompt, coverPrompt, CHARACTER_SHEET_VERSION, REFERENCE_IMAGE_PATH } from "./character";
import { assertBudget, recordCost } from "@/lib/services/costs";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";
import { getStoryVersion } from "@/lib/services/stories";

/** Szacunkowy koszt jednej okładki (quality=medium, 1536×1024). Do kontroli budżetu. */
export const IMAGE_USD_ESTIMATE = 0.08;
const COVER_SIZE = "1536x1024";

let referenceCache: Buffer | null = null;
async function referenceImage(): Promise<Buffer> {
  if (!referenceCache) referenceCache = await fs.readFile(path.join(process.cwd(), REFERENCE_IMAGE_PATH));
  return referenceCache;
}

function openai() {
  return new OpenAI({ apiKey: config.openai.apiKey, timeout: 180_000, maxRetries: 1 });
}

export class ImageGenerationUnavailable extends Error {}

/** Generuje okładkę bajki z arkuszem referencyjnym i zapisuje ją przy bajce. */
export async function generateStoryCover(storyId: string, opts: { force?: boolean } = {}) {
  await ensureRuntimeSettings();
  const story = await getStoryVersion(storyId);
  if (!story) throw new Error("Nie znaleziono bajki");
  const prompt = coverPrompt(story);
  const ref = await referenceImage();
  const model = config.openai.imageModel;
  const key = `images/covers/${storyId}-${CHARACTER_SHEET_VERSION}-${sha256(`${model}|${prompt}|${sha256(ref.toString("base64"))}`).slice(0, 16)}.webp`;
  const storage = getStorage();
  const db = getDb();

  if (!opts.force && (await storage.exists(key))) {
    await db.update("stories", { id: storyId }, { cover_path: key, updated_at: nowIso() });
    return { storagePath: key, cached: true, provider: "cache" as const };
  }
  if (!hasOpenAI()) throw new ImageGenerationUnavailable("Brak klucza OpenAI — dodaj go w Admin → Ustawienia i klucze API.");
  await assertBudget("illustration", IMAGE_USD_ESTIMATE);

  const res = await openai().images.edit({
    model,
    image: [await toFile(ref, "elofik-reference.png", { type: "image/png" })],
    prompt,
    size: COVER_SIZE,
    quality: "medium",
    output_format: "webp",
    n: 1,
    // input_fidelity jest obsługiwane tylko przez gpt-image-1.5 (dla nowszych modeli należy je pominąć)
    ...(model.startsWith("gpt-image-1.5") ? { input_fidelity: "high" as const } : {}),
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI nie zwróciło obrazu");
  await storage.put(key, Buffer.from(b64, "base64"), "image/webp");
  await db.update("stories", { id: storyId }, { cover_path: key, updated_at: nowIso() });
  await recordCost({ provider: "openai_image", purpose: "illustration", usd: IMAGE_USD_ESTIMATE, units: 1, storyId });
  return { storagePath: key, cached: false, provider: "openai" as const };
}

/** Ilustracja do dowolnej sceny (np. onboarding, prezent) — również z arkuszem referencyjnym. */
export async function generateIllustration(scene: string, purpose: "cover" | "scene" | "onboarding" | "gift" = "scene") {
  await ensureRuntimeSettings();
  const prompt = `The attached image is the official character reference sheet of ELOFIK. Draw exactly this character, only once, without copying the reference layout or captions.\n\n${illustrationPrompt(scene)}`;
  const key = `images/${purpose}/${CHARACTER_SHEET_VERSION}-${sha256(`${config.openai.imageModel}|${prompt}`).slice(0, 24)}.webp`;
  const storage = getStorage();
  if (await storage.exists(key)) return { storagePath: key, url: await storage.signedUrl(key, 24 * 3600), cached: true, provider: "cache" as const };
  if (!hasOpenAI()) return { storagePath: null, url: null, cached: false, provider: "mock" as const, prompt };
  await assertBudget("illustration", IMAGE_USD_ESTIMATE);
  const res = await openai().images.edit({
    model: config.openai.imageModel,
    image: [await toFile(await referenceImage(), "elofik-reference.png", { type: "image/png" })],
    prompt,
    size: COVER_SIZE,
    quality: "medium",
    output_format: "webp",
    n: 1,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI nie zwróciło obrazu");
  await storage.put(key, Buffer.from(b64, "base64"), "image/webp");
  await recordCost({ provider: "openai_image", purpose: "illustration", usd: IMAGE_USD_ESTIMATE, units: 1 });
  return { storagePath: key, url: await storage.signedUrl(key, 24 * 3600), cached: false, provider: "openai" as const };
}

/** Mapa okładek opublikowanych bajek: storyId → publiczny URL (z wersją do cache). */
export async function getCoverMap(): Promise<Record<string, string>> {
  const rows = await getDb().find("stories", { status: { in: ["published", "approved", "core_generated"] } });
  const out: Record<string, string> = {};
  for (const r of rows) if (r.cover_path) out[r.id] = `/api/covers/${r.id}?v=${sha256(r.cover_path).slice(0, 8)}`;
  return out;
}
