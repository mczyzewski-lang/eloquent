import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/Header";
import { AuthForm } from "@/components/onboarding/AuthForm";
import { Elofik } from "@/components/elofik/Elofik";
import { authConfig } from "@/lib/auth/public-config";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Logowanie", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; blad?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app";
  if (await getSessionUser()) redirect(next);
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-md py-10">
        <div className="mx-auto w-28"><Elofik mood="waving" /></div>
        <h1 className="mt-4 text-center text-3xl font-semibold">Witaj z powrotem!</h1>
        <p className="mt-2 text-center text-muted">Zaloguj się, a Elofik przygotuje dzisiejszą bajkę.</p>
        {sp.blad && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-center text-sm text-red-700">Link wygasł lub jest nieprawidłowy. Wyślij nowy.</p>}
        <div className="card-soft mt-6 p-6">
          <AuthForm auth={authConfig()} next={next} />
        </div>
      </main>
    </div>
  );
}
