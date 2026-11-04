import { SiteHeader } from "@/components/site/Header";
import { Elofik, Sparkles } from "@/components/elofik/Elofik";
import { ShareButtons } from "@/components/gifts/ShareButtons";
import { getDb } from "@/lib/db";
import { activationTokenFor, giverTitle } from "@/lib/services/gifts";
import { absoluteUrl } from "@/lib/config";

export const metadata = { title: "Prezent kupiony", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GiftBoughtPage({ searchParams }: { searchParams: Promise<{ session_id?: string; link?: string; demo?: string }> }) {
  const sp = await searchParams;
  let link: string | null = null;
  let childName = "";
  let giver = "";
  if (sp.session_id) {
    const purchase = await getDb().findOne("gift_purchases", { stripe_session_id: sp.session_id });
    if (purchase && (purchase.status === "paid" || purchase.status === "redeemed")) {
      link = absoluteUrl(`/aktywuj-prezent/${activationTokenFor(purchase.id)}`);
      childName = purchase.child_name;
      giver = giverTitle(purchase.giver_relation, purchase.giver_name);
    }
  } else if (sp.demo && sp.link?.startsWith("/aktywuj-prezent/")) {
    link = absoluteUrl(sp.link);
  }
  return (
    <div className="paper min-h-dvh">
      <SiteHeader variant="grandparents" />
      <main className="container-page max-w-lg py-10 text-center">
        <div className="relative mx-auto w-36"><Sparkles /><Elofik mood="jumping" /></div>
        <h1 className="mt-4 text-3xl font-semibold">Dziękujemy! Prezent jest gotowy</h1>
        {link ? (
          <>
            <p className="mt-3 text-muted">Przekaż ten link rodzicom{childName ? ` (${childName})` : ""}. Wysłaliśmy go także na Twój e-mail. Link działa jeden raz i jest ważny 12 miesięcy.</p>
            <div className="card-soft mt-6 break-all p-4 text-left text-sm text-navy">{link}</div>
            <div className="mt-4"><ShareButtons url={link} text={`${giver ? giver.charAt(0).toUpperCase() + giver.slice(1) : "Mam"} prezent dla ${childName || "wnuka"}: miesiąc codziennych bajek z Elofikiem! Aktywuj tutaj:`} /></div>
          </>
        ) : (
          <p className="mt-3 text-muted">Czekamy na potwierdzenie płatności — to zwykle trwa kilka sekund. Odśwież stronę za chwilę. Link aktywacyjny wyślemy też e-mailem.</p>
        )}
      </main>
    </div>
  );
}
