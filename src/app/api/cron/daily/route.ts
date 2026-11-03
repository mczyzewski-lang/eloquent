import { timingSafeEqual } from "node:crypto";
import { enqueueJob } from "@/lib/services/jobs";

/**
 * Wywoływane co godzinę przez Railway Cron (nagłówek Authorization: Bearer CRON_SECRET).
 * Kolejkuje wysyłkę przypomnień — worker wybiera rodziny, u których jest właśnie ich godzina.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new Response("Unauthorized", { status: 401 });
  const hour = new Date().toISOString().slice(0, 13);
  await enqueueJob("send_daily_email", {}, { dedupeKey: `daily-email-${hour}` });
  return Response.json({ ok: true });
}
