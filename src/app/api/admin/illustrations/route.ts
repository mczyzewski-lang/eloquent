import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { error, adminHandleError, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import {
  approveReference, ensureProposedReference, generateIllustrationAsset, IllustrationError, IMAGE_COST_USD, listIllustrations, MASCOT_STORY_ID,
  retireReference, reviewIllustration, uploadReference,
} from "@/lib/services/illustrations";
import { getDb } from "@/lib/db";
import { illustrationView, referenceView } from "@/lib/services/illustration-views";

export const maxDuration = 300;

const scene = z.object({
  location: z.string().max(400).optional(),
  action: z.string().max(400).optional(),
  mood: z.string().max(400).optional(),
  timeAndLighting: z.string().max(400).optional(),
  supportingCharacters: z.string().max(400).optional(),
  props: z.string().max(400).optional(),
  composition: z.string().max(400).optional(),
});

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_reference"), id: z.string().uuid() }),
  z.object({ action: z.literal("retire_reference"), id: z.string().uuid() }),
  z.object({
    action: z.literal("generate"),
    storyId: z.string().regex(/^(__mascot__|__test__|[a-z0-9-]{3,80})$/),
    imageType: z.enum(["COVER", "INTERIOR", "CHARACTER_ONLY"]),
    slot: z.string().regex(/^[a-z0-9_-]{1,30}$/).nullable().optional(),
    scene,
    quality: z.enum(["low", "medium", "high"]).default("medium"),
    regenerate: z.boolean().default(false),
  }),
  z.object({ action: z.literal("review"), id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }),
]);

async function admin() {
  const u = await getSessionUser();
  return u?.isAdmin ? u : null;
}

export async function GET(req: Request) {
  if (!(await admin())) return error("Brak uprawnień", 403);
  await ensureProposedReference();
  const storyId = new URL(req.url).searchParams.get("storyId") ?? undefined;
  const refs = await getDb().find("reference_assets", {}, { orderBy: { column: "created_at", ascending: false } });
  return json({ references: await Promise.all(refs.map(referenceView)), illustrations: await Promise.all((await listIllustrations({ storyId })).map(illustrationView)), costs: IMAGE_COST_USD });
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await admin();
    if (!user) return error("Brak uprawnień", 403);

    // wgranie nowej referencji (multipart)
    if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return error("Brak pliku", 400);
      const kind = form.get("kind") === "sheet" ? "sheet" : "master";
      const ref = await uploadReference(Buffer.from(await file.arrayBuffer()), file.type, String(form.get("label") ?? file.name), kind, user.email);
      await auditLog(user, "reference.upload", ref.id, { kind, version: ref.version });
      return json({ reference: await referenceView(ref) });
    }

    const b = body.parse(await readJson(req));
    switch (b.action) {
      case "approve_reference": {
        const ref = await approveReference(b.id, user.email);
        await auditLog(user, "reference.approve", b.id, { kind: ref.kind, version: ref.version });
        return json({ reference: await referenceView(ref) });
      }
      case "retire_reference": {
        await retireReference(b.id);
        await auditLog(user, "reference.retire", b.id);
        return json({ ok: true });
      }
      case "generate": {
        const { row, cached } = await generateIllustrationAsset({ storyId: b.storyId, imageType: b.imageType, slot: b.slot ?? null, scene: b.scene, quality: b.quality, regenerate: b.regenerate, actor: user.email });
        if (!cached) await auditLog(user, "illustration.generate", row.id, { storyId: b.storyId, type: b.imageType, version: row.version, regenerate: b.regenerate });
        return json({ illustration: await illustrationView(row), cached });
      }
      case "review": {
        const row = await reviewIllustration(b.id, b.decision, user.email);
        await auditLog(user, `illustration.${b.decision}`, b.id, { storyId: row.story_id, type: row.image_type });
        if (row.story_id === MASCOT_STORY_ID) revalidateTag("mascots", "max");
        revalidatePath("/", "layout");
        return json({ illustration: await illustrationView(row) });
      }
    }
  } catch (e) {
    if (e instanceof IllustrationError) return error(e.message, 422, { code: e.code });
    if ((e as Error).name === "BudgetExceededError") return error("Brak budżetu AI — ustaw miesięczny budżet w Ustawieniach.", 422);
    return adminHandleError(e, "illustrations");
  }
}
