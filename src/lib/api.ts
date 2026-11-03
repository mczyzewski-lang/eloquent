import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function error(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("payload_too_large");
  return text ? JSON.parse(text) : {};
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) return error("Nieprawidłowe dane", 422, { issues: e.issues.map((i) => i.path.join(".")) });
  if (e instanceof SyntaxError) return error("Nieprawidłowy JSON", 400);
  if ((e as Error)?.name === "BudgetExceededError") return error("Generowanie chwilowo niedostępne. Spróbuj za chwilę.", 503);
  console.error("[api]", e);
  return error("Coś poszło nie tak. Spróbuj ponownie.", 500);
}

/** Ochrona CSRF dla mutacji z cookies: wymagamy nagłówka Origin zgodnego z hostem. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin" || req.headers.get("sec-fetch-site") === null;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
