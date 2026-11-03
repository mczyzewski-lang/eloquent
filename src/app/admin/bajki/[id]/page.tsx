import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getStoryVersion } from "@/lib/services/stories";
import { validateStory } from "@/lib/domain/story";
import { StoryEditor } from "@/components/admin/StoryEditor";
import { StoryIllustrations } from "@/components/admin/StoryIllustrations";
import type { IllustrationView } from "@/components/admin/IllustrationCard";
import { activeMaster, ensureProposedReference, IMAGE_COST_USD, listIllustrations, sceneForStory } from "@/lib/services/illustrations";
import { illustrationView } from "@/lib/services/illustration-views";
import { getStorage } from "@/lib/storage";

export default async function AdminStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStoryVersion(id);
  const row = await getDb().findOne("stories", { id });
  if (!story || !row) notFound();
  const versions = await getDb().find("story_versions", { story_id: id }, { orderBy: { column: "version", ascending: false } });
  await ensureProposedReference();
  const master = await activeMaster();
  return (
    <div className="space-y-6">
      <StoryEditor
        initial={story}
        status={row.status}
        issues={validateStory(story)}
        coverUrl={row.cover_path ? `/api/covers/${id}?v=${encodeURIComponent(row.updated_at)}` : null}
        versions={versions.map((v) => ({ version: v.version, reviewedBy: v.reviewed_by, createdAt: v.created_at }))}
      />
      <StoryIllustrations
        storyId={id}
        initialScene={await sceneForStory(id)}
        items={(await Promise.all((await listIllustrations({ storyId: id })).map(illustrationView))) as IllustrationView[]}
        referenceUrl={master ? await getStorage().signedUrl(master.storage_path, 6 * 3600) : null}
        costs={IMAGE_COST_USD}
      />
    </div>
  );
}
