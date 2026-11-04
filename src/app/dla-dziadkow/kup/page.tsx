import { SiteHeader } from "@/components/site/Header";
import { GiftPurchaseForm } from "@/components/gifts/GiftPurchaseForm";
import { Elofik } from "@/components/elofik/Elofik";

export const metadata = { title: "Podaruj codzienne bajki", alternates: { canonical: "/dla-dziadkow/kup" } };

export default function BuyGiftPage() {
  return (
    <div className="paper min-h-dvh">
      <SiteHeader variant="grandparents" />
      <main className="container-page max-w-2xl py-8">
        <div className="flex items-center gap-4">
          <div className="w-20 flex-none"><Elofik mood="hug" /></div>
          <div>
            <h1 className="text-3xl font-semibold">Prezent, który rozwija przez cały miesiąc</h1>
            <p className="mt-1 text-muted">Codzienne bajki z Elofikiem dla wnuka — w których możesz wystąpić także Ty.</p>
          </div>
        </div>
        <div className="mt-6"><GiftPurchaseForm /></div>
      </main>
    </div>
  );
}
