import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/** Publiczne serwowanie ilustracji — WYŁĄCZNIE zatwierdzonych (odrzucone i oczekujące → 404). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const row = await getDb().findOne("illustrations", { id });
  if (!row || row.status !== "approved" || !row.storage_path) return new Response("Not found", { status: 404 });
  const data = await getStorage().get(row.storage_path);
  if (!data) return new Response("Not found", { status: 404 });
  const type = row.storage_path.endsWith(".png") ? "image/png" : "image/webp";
  return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
}
