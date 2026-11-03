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

/**
 * Obsługa błędów dla tras panelu admina: zamiast ogólnego „Coś poszło nie tak” zwraca konkretną przyczynę
 * (tylko dla zalogowanego admina — nigdy w publicznych trasach) i wskazówkę, co zrobić.
 */
export function adminHandleError(e: unknown, context: string) {
  if (e instanceof ZodError || e instanceof SyntaxError) return handleError(e);
  const err = e as Error & { status?: number; code?: string; cause?: { code?: string; message?: string } };
  console.error(`[admin:${context}]`, e);
  const name = err?.name ?? "Error";
  const raw = `${err?.message ?? String(e)}${err?.cause?.message ? ` (${err.cause.message})` : ""}`.slice(0, 400);
  let hint = "";
  if (/timeout|timed out/i.test(`${name} ${raw}`)) hint = " Wskazówka: dostawca nie odpowiedział w czasie — spróbuj ponownie lub wybierz niższą jakość.";
  else if (/APIConnectionError|ECONNRESET|ENOTFOUND|fetch failed/i.test(`${name} ${raw} ${err?.cause?.code ?? ""}`)) hint = " Wskazówka: brak połączenia z API dostawcy (sieć serwera) — spróbuj za chwilę.";
  else if (/ENOENT|EACCES|EROFS|ENOSPC/i.test(`${raw} ${err?.code ?? ""}`)) hint = " Wskazówka: problem z zapisem pliku na serwerze (wolumen Railway: miejsce lub uprawnienia).";
  else if (err?.status === 400) hint = " Wskazówka: dostawca odrzucił parametry żądania (model, rozmiar lub format).";
  else if (err?.status === 401 || err?.status === 403) hint = " Wskazówka: sprawdź klucz API i jego uprawnienia w Ustawieniach.";
  else if (err?.status === 429) hint = " Wskazówka: limit dostawcy (rate limit lub brak środków na koncie).";
  return error(`${name}${err?.status ? ` ${err.status}` : ""}: ${raw}${hint}`, err?.status && err.status >= 400 && err.status < 600 ? 502 : 500);
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
