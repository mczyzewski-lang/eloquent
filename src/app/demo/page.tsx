import Link from "next/link";
import { notFound } from "next/navigation";
import { config, isDemoMode } from "@/lib/config";
import { adminPasswordConfigured } from "@/lib/auth/admin-password";
import { SiteHeader } from "@/components/site/Header";
import { Card } from "@/components/ui/card";
import { DemoLauncher } from "@/components/site/DemoLauncher";

export const metadata = { title: "Demo", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Centrum demo: przykładowa rodzina Leona (5 lat): mama Monika, tata Marek, babcia Basia, dziadek Jan, pies Burek. */
export default function DemoPage() {
  if (!isDemoMode()) notFound();
  const links: [string, string][] = [
    ["/", "Landing + personalizowana próbka"],
    ["/onboarding?imie=Leon", "Onboarding"],
    ["/app", "Dashboard (Dzień 7, zablokowane dni)"],
    ["/app/bajka/dzien-01-tajemniczy-slad", "Dzień 1 — ekran „Hej Elofik!” i player"],
    ["/app/bajka/dzien-07-zaginiona-gwiazda", "Dzień 7"],
    ["/dla-dziadkow", "Prezent od babci (bezpłatny)"],
    ["/dla-dziadkow/kup", "Zakup prezentowy"],
    ["/konto", "Panel rodzica"],
    ["/admin", "Panel admina"],
  ];
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-2xl py-8">
        <h1 className="text-3xl font-semibold">Tryb demonstracyjny</h1>
        <p className="mt-2 text-muted">Dane w pliku lokalnym, głos i rozpoznawanie mowy symulowane (bez kluczy API), płatności symulowane.</p>
        <Card className="mt-6">
          <p className="font-display text-lg font-semibold">Rodzina demo</p>
          <p className="mt-1 text-muted">Leon (5 lat) · mama Monika · tata Marek · babcia Basia · dziadek Jan · pies Burek. Aktywacja 6 dni temu (Dzień 7 dostępny), aktywny abonament.</p>
          <DemoLauncher adminEnabled={!adminPasswordConfigured() && config.appEnv !== "production"} />
        </Card>
        <ul className="mt-6 grid gap-2">
          {links.map(([h, l]) => <li key={h}><Link href={h} className="card-soft block p-4 font-semibold text-navy hover:bg-peach/40">{l}</Link></li>)}
        </ul>
      </main>
    </div>
  );
}
