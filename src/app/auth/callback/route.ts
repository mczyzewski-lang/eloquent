import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/config";

/** Powrót z magic linka / OAuth: wymiana kodu na sesję i bezpieczne przekierowanie (tylko ścieżki względne). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/app";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/app";
  if (code) {
    const supabase = await supabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(absoluteUrl(`/logowanie?blad=1`));
  }
  return NextResponse.redirect(absoluteUrl(next));
}
