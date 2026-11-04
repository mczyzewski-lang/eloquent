/**
 * System ilustracji Elofika (wg ELOFIK_Prompt_Ilustracje):
 * - wersjonowana, zatwierdzana przez admina referencja (master) + opcjonalny character sheet,
 * - prompt = kanoniczny CHARACTER_AND_STYLE_PROMPT + wariant formatu + blok sceny,
 * - każde generowanie dołącza zatwierdzoną referencję (OpenAI images.edit z obrazami wejściowymi),
 * - cache/unikalność po stabilnym hashu — bez ponownego płacenia za ten sam materiał,
 * - nic nie trafia do produktu bez akceptacji w panelu; odrzucone ilustracje nie są publiczne.
 */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { config, hasOpenAI } from "@/lib/config";
import { getDb, nowIso, type IllustrationRow, type ReferenceAssetRow } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { sha256 } from "@/lib/domain/hash";
import { buildImagePrompt, PROMPT_VERSION, sanitizeScene, sizeFor, type ImageType, type SceneSpec } from "@/lib/ai/elofik-bible";
import { DEFAULT_SCENES, fallbackScene } from "@/content/illustration-scenes";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";
import { assertBudget, recordCost } from "./costs";
import { getStoryVersion } from "./stories";

export const MASCOT_STORY_ID = "__mascot__";
export const TEST_STORY_ID = "__test__";
export const LANDING_STORY_ID = "__landing__";
/** Szacunkowy koszt jednej ilustracji wg jakości (USD) — do kontroli budżetu i potwierdzeń w panelu. */
export const IMAGE_COST_USD: Record<"low" | "medium" | "high", number> = { low: 0.03, medium: 0.08, high: 0.25 };

export class IllustrationError extends Error {
  constructor(message: string, public code: "no_key" | "no_reference" | "not_found" | "invalid" = "invalid") {
    super(message);
  }
}

// ---------- referencje --------------------------------------------------------

/** Kanoniczny wygląd Elofika (grafiki od właściciela marki). Zmiana = nowy tag → nowa referencja. */
export const BRAND_REFERENCE_TAG = "Elofik — grafiki marki v2";
const BRAND_MASTER_FILE = "public/brand/elofik/idle.webp";
const BRAND_SHEET_FILE = "public/brand/elofik-reference-sheet.webp";

/**
 * Referencja kanoniczna: postać i arkusz póz dostarczone przez właściciela marki.
 * Zatwierdzana automatycznie (to decyzja właściciela, nie wynik AI) i wycofuje poprzednie wzorce —
 * ilustracje wygenerowane ze starym wyglądem przestają być publikowane.
 */
export async function ensureProposedReference(): Promise<void> {
  const db = getDb();
  if (await db.findOne("reference_assets", { label: BRAND_REFERENCE_TAG, kind: "master" })) return;
  const [master, sheet] = await Promise.all([
    fs.readFile(path.join(process.cwd(), BRAND_MASTER_FILE)).catch(() => null),
    fs.readFile(path.join(process.cwd(), BRAND_SHEET_FILE)).catch(() => null),
  ]);
  if (!master) return;
  const storage = getStorage();
  const now = nowIso();
  const actor = "właściciel marki (grafiki dostarczone)";
  await db.update("reference_assets", { status: "approved" }, { status: "retired" });
  await db.update("reference_assets", { status: "proposed" }, { status: "retired" });
  const nextVersion = async (kind: "master" | "sheet") => Math.max(0, ...(await db.find("reference_assets", { kind })).map((r) => r.version)) + 1;
  const mv = await nextVersion("master");
  await storage.put(`references/master-v${mv}-brand.webp`, master, "image/webp");
  await db.insert("reference_assets", { kind: "master", version: mv, label: BRAND_REFERENCE_TAG, storage_path: `references/master-v${mv}-brand.webp`, status: "approved", approved_by: actor, approved_at: now, created_at: now });
  if (sheet) {
    const sv = await nextVersion("sheet");
    await storage.put(`references/sheet-v${sv}-brand.webp`, sheet, "image/webp");
    await db.insert("reference_assets", { kind: "sheet", version: sv, label: `${BRAND_REFERENCE_TAG} — arkusz póz`, storage_path: `references/sheet-v${sv}-brand.webp`, status: "approved", approved_by: actor, approved_at: now, created_at: now });
  }
}

export async function uploadReference(data: Buffer, mime: string, label: string, kind: "master" | "sheet", actor: string): Promise<ReferenceAssetRow> {
  if (!["image/png", "image/webp", "image/jpeg"].includes(mime)) throw new IllustrationError("Dozwolone formaty: PNG, WEBP, JPEG.");
  if (data.length > 8 * 1024 * 1024) throw new IllustrationError("Plik może mieć maks. 8 MB.");
  const db = getDb();
  const version = Math.max(0, ...(await db.find("reference_assets", { kind })).map((r) => r.version)) + 1;
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const storagePath = `references/${kind}-v${version}-${sha256(data.toString("base64")).slice(0, 10)}.${ext}`;
  await getStorage().put(storagePath, data, mime);
  void actor;
  return db.insert("reference_assets", { kind, version, label: label.slice(0, 120) || `${kind} v${version}`, storage_path: storagePath, status: "proposed", approved_by: null, approved_at: null, created_at: nowIso() });
}

/** Akceptacja referencji. Nowy master wycofuje poprzedni (i jego character sheet) — bez mieszania kanonów. */
export async function approveReference(id: string, actor: string) {
  const db = getDb();
  const ref = await db.findOne("reference_assets", { id });
  if (!ref) throw new IllustrationError("Nie znaleziono referencji.", "not_found");
  if (ref.kind === "master") {
    await db.update("reference_assets", { status: "approved" }, { status: "retired" });
  }
  return (await db.update("reference_assets", { id }, { status: "approved", approved_by: actor, approved_at: nowIso() }))[0];
}

export async function retireReference(id: string) {
  return (await getDb().update("reference_assets", { id }, { status: "retired" }))[0];
}

export async function activeMaster(): Promise<ReferenceAssetRow | null> {
  await ensureProposedReference();
  return (await getDb().find("reference_assets", { kind: "master", status: "approved" }, { orderBy: { column: "version", ascending: false }, limit: 1 }))[0] ?? null;
}

async function activeSheets(): Promise<ReferenceAssetRow[]> {
  return getDb().find("reference_assets", { kind: "sheet", status: "approved" }, { orderBy: { column: "version", ascending: false }, limit: 3 });
}

// ---------- generowanie --------------------------------------------------------

export function illustrationCacheKey(p: { referenceId: string; referenceVersion: number; promptVersion: string; storyId: string; storyVersion: number; imageType: ImageType; slot: string | null; scenePrompt: string; model: string; size: string; quality: string }) {
  return sha256(JSON.stringify(p));
}

export async function sceneForStory(storyId: string): Promise<SceneSpec> {
  const stored = (await getDb().find("illustrations", { story_id: storyId }, { orderBy: { column: "created_at", ascending: false }, limit: 1 }))[0];
  if (stored?.scene && Object.keys(stored.scene).length) return sanitizeScene(stored.scene as Partial<SceneSpec>);
  if (DEFAULT_SCENES[storyId]) return DEFAULT_SCENES[storyId];
  const story = await getStoryVersion(storyId);
  return fallbackScene(story ?? { illustrationPrompt: "", summary: "" });
}

export interface GenerateInput {
  storyId: string;
  imageType: ImageType;
  scene: Partial<SceneSpec>;
  slot?: string | null;
  quality?: "low" | "medium" | "high";
  /** Świadoma regeneracja: tworzy nową wersję mimo istniejącej ilustracji o tym samym kluczu. */
  regenerate?: boolean;
  actor: string;
}

export async function generateIllustrationAsset(input: GenerateInput): Promise<{ row: IllustrationRow; cached: boolean }> {
  await ensureRuntimeSettings();
  const db = getDb();
  const master = await activeMaster();
  if (!master) throw new IllustrationError("Najpierw zatwierdź obraz referencyjny Elofika (Admin → Ilustracje).", "no_reference");
  const quality = input.quality ?? "medium";
  const model = config.openai.imageModel;
  const imageType = input.imageType;
  const size = sizeFor(imageType, model);
  const scene = sanitizeScene(input.scene);
  const prompt = buildImagePrompt(imageType, scene);
  const story = input.storyId.startsWith("__") ? null : await getStoryVersion(input.storyId);
  if (!input.storyId.startsWith("__") && !story) throw new IllustrationError("Nie znaleziono bajki.", "not_found");
  const storyVersion = story?.version ?? 1;
  const slot = input.slot ?? null;
  const cacheKey = illustrationCacheKey({ referenceId: master.id, referenceVersion: master.version, promptVersion: PROMPT_VERSION, storyId: input.storyId, storyVersion, imageType, slot, scenePrompt: prompt, model, size, quality });

  if (!input.regenerate) {
    const hit = (await db.find("illustrations", { cache_key: cacheKey, status: { in: ["pending", "approved"] } }, { limit: 1 }))[0];
    if (hit) return { row: hit, cached: true };
  }
  if (!hasOpenAI()) throw new IllustrationError("Brak klucza OpenAI — tryb demo: obrazy nie są generowane. Dodaj klucz w Admin → Ustawienia i klucze API.", "no_key");
  const estUsd = IMAGE_COST_USD[quality];
  await assertBudget("illustration", estUsd);

  const storage = getStorage();
  const refs = [master, ...(await activeSheets())];
  const images = await Promise.all(
    refs.map(async (r, i) => {
      const data = await storage.get(r.storage_path);
      if (!data) throw new IllustrationError(`Brak pliku referencji ${r.label}.`, "no_reference");
      return toFile(data, `elofik-reference-${i + 1}${path.extname(r.storage_path) || ".png"}`, { type: r.storage_path.endsWith(".webp") ? "image/webp" : r.storage_path.endsWith(".jpg") ? "image/jpeg" : "image/png" });
    }),
  );
  const transparent = imageType === "CHARACTER_ONLY";
  const client = new OpenAI({ apiKey: config.openai.apiKey, timeout: 240_000, maxRetries: 1 });
  const res = await client.images.edit({
    model,
    image: images,
    prompt,
    size,
    quality,
    n: 1,
    output_format: transparent ? "png" : "webp",
    ...(transparent ? { background: "transparent" as const } : {}),
    // input_fidelity obsługuje tylko gpt-image-1.5; dla gpt-image-2.x parametr należy pominąć
    ...(model.startsWith("gpt-image-1.5") ? { input_fidelity: "high" as const } : {}),
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new IllustrationError("OpenAI nie zwróciło obrazu.");
  const version = Math.max(0, ...(await db.find("illustrations", { story_id: input.storyId, image_type: imageType, slot })).map((r) => r.version)) + 1;
  const ext = transparent ? "png" : "webp";
  // nazwy plików bez danych dzieci: tylko id bajki, typ i wersja
  const storagePath = `illustrations/${input.storyId.replace(/_/g, "")}/${imageType.toLowerCase()}${slot ? `-${slot}` : ""}-v${version}-${cacheKey.slice(0, 8)}.${ext}`;
  await storage.put(storagePath, Buffer.from(b64, "base64"), transparent ? "image/png" : "image/webp");
  await recordCost({ provider: "openai_image", purpose: "illustration", usd: estUsd, units: 1, storyId: story?.storyId ?? null });
  const row = await db.insert("illustrations", {
    story_id: input.storyId,
    story_version: storyVersion,
    image_type: imageType,
    slot,
    version,
    scene: scene as unknown as Record<string, string>,
    prompt,
    prompt_version: PROMPT_VERSION,
    reference_id: master.id,
    reference_version: master.version,
    model,
    size,
    quality,
    cache_key: cacheKey,
    storage_path: storagePath,
    status: "pending",
    est_usd: estUsd,
    error: null,
    created_by: input.actor,
    created_at: nowIso(),
    reviewed_by: null,
    reviewed_at: null,
  });
  return { row, cached: false };
}

// ---------- akceptacja ----------------------------------------------------------

async function latestApproved(storyId: string, imageType: IllustrationRow["image_type"], slot: string | null) {
  return (await getDb().find("illustrations", { story_id: storyId, image_type: imageType, slot, status: "approved" }, { orderBy: { column: "reviewed_at", ascending: false }, limit: 1 }))[0] ?? null;
}

async function syncStoryCover(storyId: string) {
  if (storyId.startsWith("__")) return;
  const cover = await latestApproved(storyId, "COVER", null);
  await getDb().update("stories", { id: storyId }, { cover_path: cover?.storage_path ?? null, updated_at: nowIso() });
}

export async function reviewIllustration(id: string, decision: "approved" | "rejected", actor: string) {
  const db = getDb();
  const row = await db.findOne("illustrations", { id });
  if (!row) throw new IllustrationError("Nie znaleziono ilustracji.", "not_found");
  const [updated] = await db.update("illustrations", { id }, { status: decision, reviewed_by: actor, reviewed_at: nowIso() });
  if (row.image_type === "COVER") await syncStoryCover(row.story_id);
  return updated;
}

export async function listIllustrations(filter: { storyId?: string; status?: IllustrationRow["status"] } = {}) {
  return getDb().find("illustrations", { ...(filter.storyId ? { story_id: filter.storyId } : {}), ...(filter.status ? { status: filter.status } : {}) }, { orderBy: { column: "created_at", ascending: false }, limit: 200 });
}

/** URL publiczny — tylko zatwierdzone ilustracje (route /api/illustrations/[id] odrzuca inne). */
export function publicIllustrationUrl(row: Pick<IllustrationRow, "id" | "cache_key">) {
  return `/api/illustrations/${row.id}?v=${row.cache_key.slice(0, 8)}`;
}

/** Zatwierdzone pozy maskotki do UI: mood → URL. */
export async function mascotMapUncached(): Promise<Record<string, string>> {
  const rows = await getDb().find("illustrations", { story_id: MASCOT_STORY_ID, status: "approved" }, { orderBy: { column: "reviewed_at", ascending: true } });
  const out: Record<string, string> = {};
  for (const r of rows) if (r.slot) out[r.slot] = publicIllustrationUrl(r); // późniejsza akceptacja nadpisuje
  return out;
}

/** Zatwierdzone grafiki strony (landing): slot → URL. */
export async function landingArtUncached(): Promise<Record<string, string>> {
  const master = await activeMaster();
  if (!master) return {};
  // tylko grafiki z aktualnym wyglądem Elofika (po zmianie wzorca stare znikają ze strony)
  const rows = await getDb().find("illustrations", { story_id: LANDING_STORY_ID, status: "approved", reference_id: master.id }, { orderBy: { column: "reviewed_at", ascending: true } });
  const out: Record<string, string> = {};
  for (const r of rows) if (r.slot) out[r.slot] = publicIllustrationUrl(r);
  return out;
}

/** Mapa okładek: tylko zatwierdzone (stories.cover_path ustawiane wyłącznie przy akceptacji). */
export async function getCoverMap(): Promise<Record<string, string>> {
  const db = getDb();
  const master = await activeMaster();
  if (!master) return {};
  const rows = await db.find("stories", { status: { in: ["published", "approved", "core_generated"] } });
  // okładka tylko, jeśli powstała z aktualnym wyglądem Elofika
  const current = new Set((await db.find("illustrations", { image_type: "COVER", status: "approved", reference_id: master.id })).map((i) => i.storage_path));
  const out: Record<string, string> = {};
  for (const r of rows) if (r.cover_path && current.has(r.cover_path)) out[r.id] = `/api/covers/${r.id}?v=${sha256(r.cover_path).slice(0, 8)}`;
  return out;
}
