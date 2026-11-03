import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Odświeża sesję Supabase (gdy skonfigurowany) i wymusza kanoniczny host produkcyjny.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host === "www.elofik.com") {
    const url = new URL(request.url);
    url.host = "elofik.com";
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || process.env.ELOFIK_DEMO_MODE === "1") return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|covers/|illustrations/|sw.js|manifest.webmanifest|api/webhooks).*)"],
};
