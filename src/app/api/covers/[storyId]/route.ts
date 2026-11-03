import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/**
 * Okładki bajek (wspólne dla wszystkich, bez danych dzieci) — publiczne, z długim cache.
 * Wersja w zapytaniu (?v=) zmienia się przy każdej nowej okładce.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  if (!/^[a-z0-9-]{3,80}$/.test(storyId)) return new Response("Not found", { status: 404 });
  const story = await getDb().findOne("stories", { id: storyId });
  if (!story?.cover_path || story.status === "archived" || story.status === "draft") return new Response("Not found", { status: 404 });
  const data = await getStorage().get(story.cover_path);
  if (!data) return new Response("Not found", { status: 404 });
  const type = story.cover_path.endsWith(".webp") ? "image/webp" : story.cover_path.endsWith(".png") ? "image/png" : "image/jpeg";
  return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
