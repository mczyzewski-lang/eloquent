import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getStoryVersion } from "@/lib/services/stories";
import { validateStory } from "@/lib/domain/story";
import { StoryEditor } from "@/components/admin/StoryEditor";

export default async function AdminStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStoryVersion(id);
  const row = await getDb().findOne("stories", { id });
  if (!story || !row) notFound();
  const versions = await getDb().find("story_versions", { story_id: id }, { orderBy: { column: "version", ascending: false } });
  return (
    <StoryEditor
      initial={story}
      status={row.status}
      issues={validateStory(story)}
      versions={versions.map((v) => ({ version: v.version, reviewedBy: v.reviewed_by, createdAt: v.created_at }))}
    />
  );
}
