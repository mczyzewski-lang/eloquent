import { getStorage, verifyMediaToken } from "@/lib/storage";

/**
 * Serwowanie prywatnych plików z lokalnego storage (demo/dev). Na produkcji audio idzie
 * bezpośrednio z podpisanych URL-i Supabase Storage. Obsługa Range — wymagana przez iOS Safari.
 */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t");
  const key = t ? verifyMediaToken(t) : null;
  if (!key) return new Response("Forbidden", { status: 403 });
  const data = await getStorage().get(key);
  if (!data) return new Response("Not found", { status: 404 });
  const type = key.endsWith(".mp3") ? "audio/mpeg" : key.endsWith(".wav") ? "audio/wav" : key.endsWith(".png") ? "image/png" : "application/octet-stream";
  const headers: Record<string, string> = { "content-type": type, "accept-ranges": "bytes", "cache-control": "private, max-age=3600" };
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
    if (start >= data.length) return new Response(null, { status: 416, headers: { "content-range": `bytes */${data.length}` } });
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${data.length}`, "content-length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, "content-length": String(data.length) } });
}
