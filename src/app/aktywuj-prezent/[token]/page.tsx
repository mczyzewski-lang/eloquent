import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/Header";
import { Elofik, Sparkles } from "@/components/elofik/Elofik";
import { RedeemGift } from "@/components/gifts/RedeemGift";
import { getGiftPurchaseByToken, giverTitle } from "@/lib/services/gifts";
import { getNameForms } from "@/lib/domain/names";
import { getSessionUser } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/public-config";
import { PageView } from "@/components/site/PageView";

export const metadata = { title: "Aktywuj prezent", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ActivateGiftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const purchase = await getGiftPurchaseByToken(token);
  if (!purchase) notFound();
  const forms = getNameForms(purchase.child_name);
  const giver = giverTitle(purchase.giver_relation, purchase.giver_name);
  const giverCap = giver.charAt(0).toUpperCase() + giver.slice(1);
  const name = forms.nominative;
  const gen = forms.genitive; // „dla Leona” — bez zgadywania celownika
  const verb = purchase.giver_relation === "grandma" ? "podarowała" : purchase.giver_relation === "grandpa" ? "podarował" : "podarował(a)";
  const user = await getSessionUser();
  return (
    <div className="paper min-h-dvh">
      <PageView event="gift_activation_viewed" />
      <SiteHeader />
      <main className="container-page max-w-lg py-8 text-center">
        <div className="relative mx-auto w-36"><Sparkles /><Elofik mood="hug" /></div>
        <h1 className="mt-4 text-3xl font-semibold">{giverCap} {verb} prezent{gen ? ` dla ${gen}` : ""}: codzienne przygody z Elofikiem!</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Każdego dnia {name} może odkrywać nową bajkę, poznawać wartościowe słowa i przeżywać przygody z Elofikiem. A w historiach może pojawiać się także {giver}.
        </p>
        {purchase.status === "redeemed" ? (
          <p className="mt-6 rounded-2xl bg-sage/20 p-4 font-semibold text-sage-deep">Ten prezent został już aktywowany. Zaloguj się, aby słuchać bajek.</p>
        ) : purchase.status !== "paid" ? (
          <p className="mt-6 rounded-2xl bg-peach p-4">Czekamy na potwierdzenie płatności. Spróbuj za kilka minut.</p>
        ) : (
          <div className="mt-6">
            <RedeemGift token={token} loggedIn={Boolean(user)} auth={authConfig()} ctaLabel={gen ? `Aktywuj prezent dla ${gen}` : "Aktywuj prezent"} />
          </div>
        )}
        <p className="mt-6 text-xs text-muted">Prezent: 1 miesiąc dostępu, bez automatycznego odnowienia i bez podawania karty.</p>
      </main>
    </div>
  );
}
