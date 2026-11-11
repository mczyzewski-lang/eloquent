import Link from "next/link";
import { Headphones } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/Header";
import { TrailFilm } from "@/components/film/trail/TrailFilm";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Elofik i tajemniczy ślad — krótki film",
  description: "Minutowy film animowany do pierwszej bajki Elofika: srebrzyste ślady, dociekliwość i jeżyk-świetlik. Zobacz, a potem posłuchaj całej bajki z imieniem swojego dziecka.",
  alternates: { canonical: "/film/tajemniczy-slad" },
};

export default async function FilmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const t = sp.t !== undefined && Number.isFinite(Number(sp.t)) ? Math.max(0, Math.min(84, Number(sp.t))) : undefined;
  return (
    <div className="paper min-h-dvh">
      <PageView event="landing_viewed" />
      <SiteHeader />
      <main className="container-page max-w-5xl py-8">
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">Dzień 1 · słowo: dociekliwość</p>
        <h1 className="mt-2 text-center text-3xl font-semibold sm:text-4xl">Elofik i tajemniczy ślad</h1>
        <div className="mt-6"><TrailFilm initialTime={t} /></div>
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-lg leading-relaxed text-muted">
            To tylko zwiastun. W pełnej bajce Elofik zwraca się do dziecka po imieniu, a w przygodzie mogą wystąpić mama, tata, babcia, dziadek i ukochany zwierzak. Bajki Elofika są do słuchania — ekran można odłożyć.
          </p>
          <Link href="/#probka" className={cn(buttonVariants({ size: "lg" }), "mt-6")}><Headphones className="h-5 w-5" /> Posłuchaj bajki z imieniem dziecka</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
