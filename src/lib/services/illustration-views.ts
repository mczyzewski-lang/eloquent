import { getStorage } from "@/lib/storage";
import type { IllustrationRow, ReferenceAssetRow } from "@/lib/db";

/** Widoki dla panelu admina — podpisane URL-e także dla oczekujących (tylko admin). */
export async function illustrationView(r: IllustrationRow) {
  return {
    id: r.id,
    storyId: r.story_id,
    imageType: r.image_type,
    slot: r.slot,
    version: r.version,
    status: r.status,
    scene: r.scene,
    model: r.model,
    size: r.size,
    quality: r.quality,
    promptVersion: r.prompt_version,
    referenceVersion: r.reference_version,
    estUsd: r.est_usd,
    createdAt: r.created_at,
    reviewedBy: r.reviewed_by,
    url: r.storage_path ? await getStorage().signedUrl(r.storage_path, 6 * 3600) : null,
  };
}

export async function referenceView(r: ReferenceAssetRow) {
  return { id: r.id, kind: r.kind, version: r.version, label: r.label, status: r.status, approvedBy: r.approved_by, approvedAt: r.approved_at, url: await getStorage().signedUrl(r.storage_path, 6 * 3600) };
}

