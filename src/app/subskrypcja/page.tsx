import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/Header";
import { Card } from "@/components/ui/card";
import { Elofik } from "@/components/elofik/Elofik";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { PREMIUM_FEATURES } from "@/lib/domain/pricing";
import { getSessionUser } from "@/lib/auth/session";
import { getFamilyByOwner } from "@/lib/services/families";
import { getAccess } from "@/lib/services/access";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Abonament Elofik Premium", alternates: { canonical: "/subskrypcja" } };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ anulowano?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const family = user ? await getFamilyByOwner(user.id) : null;
  const access = family ? await getAccess(family.id) : null;
  return (
    <div className="paper min-h-dvh">
      <SiteHeader variant={family ? "app" : "parents"} />
      <main className="container-page max-w-lg py-10">
        <div className="mx-auto w-28"><Elofik mood="love" /></div>
        <h1 className="mt-4 text-center text-3xl font-semibold">Elofik Premium</h1>
        <p className="mt-2 text-center text-muted">Codzienny rytuał, który rozwija słownictwo i wyobraźnię.</p>
        {sp.anulowano && <p className="mt-4 rounded-2xl bg-peach p-3 text-center text-sm">Płatność została przerwana — nic nie pobraliśmy.</p>}
        <Card className="mt-6 border-2 border-gold">
          <p className="text-center font-display text-5xl font-semibold text-navy">39,90 zł</p>
          <p className="text-center text-muted">brutto / miesiąc · anulujesz w każdej chwili</p>
          <ul className="mt-6 space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2"><Sparkles className="mt-1 h-4 w-4 flex-none text-gold-deep" />{f}</li>
            ))}
          </ul>
          <div className="mt-6">
            {access?.hasAccess ? (
              <Link href="/konto" className={buttonVariants({ size: "lg", variant: "soft", className: "w-full" })}>Masz aktywny dostęp — zarządzaj w panelu</Link>
            ) : family ? (
              <CheckoutButton size="lg" className="w-full">Wykup abonament</CheckoutButton>
            ) : (
              <Link href="/onboarding" className={buttonVariants({ size: "lg", className: "w-full" })}>Najpierw stwórz profil dziecka</Link>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-muted">Płatności obsługuje Stripe. Po anulowaniu dostęp trwa do końca opłaconego okresu.</p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
