/** Ilustracje (OpenAI Images API). Jedna grafika na bajkę — nigdy osobno dla imienia dziecka. */
import OpenAI from "openai";
import { config, hasOpenAI } from "@/lib/config";
import { getStorage } from "@/lib/storage";
import { sha256 } from "@/lib/domain/hash";
import { illustrationPrompt, CHARACTER_SHEET_VERSION } from "./character";
import { assertBudget, recordCost } from "@/lib/services/costs";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export const IMAGE_USD_ESTIMATE = 0.07;

export async function generateIllustration(scene: string, purpose: "cover" | "scene" | "onboarding" | "gift" = "cover") {
  await ensureRuntimeSettings();
  const prompt = illustrationPrompt(scene);
  const key = `images/${purpose}/${CHARACTER_SHEET_VERSION}-${sha256(prompt).slice(0, 24)}.png`;
  const storage = getStorage();
  if (await storage.exists(key)) return { storagePath: key, url: await storage.signedUrl(key, 24 * 3600), cached: true, provider: "cache" as const };
  if (!hasOpenAI()) return { storagePath: null, url: null, cached: false, provider: "mock" as const, prompt };
  await assertBudget("illustration", IMAGE_USD_ESTIMATE);
  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const res = await client.images.generate({ model: config.openai.imageModel, prompt, size: "1024x1024", n: 1 });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Brak obrazu w odpowiedzi OpenAI");
  await storage.put(key, Buffer.from(b64, "base64"), "image/png");
  await recordCost({ provider: "openai_image", purpose: "illustration", usd: IMAGE_USD_ESTIMATE, units: 1 });
  return { storagePath: key, url: await storage.signedUrl(key, 24 * 3600), cached: false, provider: "openai" as const };
}
