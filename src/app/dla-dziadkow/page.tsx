import Link from "next/link";
import { Gift, Heart, Sparkles as SparklesIcon } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/Header";
import { GiftCreator } from "@/components/gifts/GiftCreator";
import { GrandparentsIllustration } from "@/components/gifts/GrandparentsIllustration";
import { Card, SectionTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { cn } from "@/lib/utils";
import { getLandingArt } from "@/lib/services/mascots";
import { StoryFrame } from "@/components/landing/Magic";

export const metadata = {
  title: "Prezent od babci i dziadka",
  description: "Podaruj wnukowi bajkę, w której wystąpicie razem. Bezpłatna niespodzianka albo miesiąc codziennych bajek z Elofikiem w prezencie.",
  alternates: { canonical: "/dla-dziadkow" },
};

export default async function GrandparentsPage({ searchParams }: { searchParams: Promise<{ anulowano?: string }> }) {
  const sp = await searchParams;
  const art = await getLandingArt().catch(() => ({}) as Record<string, string>);
  return (
    <div className="paper">
      <PageView event="grandparents_landing_viewed" />
      <SiteHeader variant="grandparents" />
      <section className="container-page grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
        <div className="text-center lg:text-left">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">Dla babci i dziadka</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Podaruj wnuczkowi bajkę, w której wystąpicie razem</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
            Stwórz bezpłatną opowieść, w której Elofik zabierze Twojego wnuka w magiczną przygodę. A jeśli chcesz, możesz podarować mu coś więcej — codzienne bajki rozwijające słownictwo, wyobraźnię i ciekawość świata.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a href="#kreator" className={buttonVariants({ size: "lg" })}><Gift className="h-5 w-5" /> Stwórz bezpłatną niespodziankę</a>
            <Link href="/dla-dziadkow/kup" className={buttonVariants({ size: "lg", variant: "soft" })}>Podaruj codzienne bajki</Link>
          </div>
          {sp.anulowano && <p className="mt-4 rounded-2xl bg-peach p-3 text-sm">Płatność została przerwana — nic nie pobraliśmy.</p>}
        </div>
        {art.family ? <StoryFrame src={art.family} alt="Elofik opowiada bajkę babci, dziadkowi i wnukowi" className="aspect-[3/2] w-full" /> : <GrandparentsIllustration />}
      </section>

      <section className="container-page py-12">
        <SectionTitle eyebrow="Dwie możliwości" title="Wybierz swój prezent" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="flex flex-col">
            <Heart className="h-8 w-8 text-peach-deep" />
            <h3 className="mt-3 text-2xl font-semibold">Mała niespodzianka, wielki uśmiech</h3>
            <p className="mt-2 flex-1 text-muted">Stwórz krótką bajkę, w której Elofik wymieni imię wnuka i Twoje. Wyślij link rodzicom i podaruj dziecku chwilę radości.</p>
            <p className="mt-4 font-display text-2xl font-semibold text-sage-deep">Bezpłatnie</p>
            <a href="#kreator" className={cn(buttonVariants({ size: "md" }), "mt-4")}>Stwórz niespodziankę</a>
          </Card>
          <Card className="flex flex-col border-2 border-gold">
            <SparklesIcon className="h-8 w-8 text-gold-deep" />
            <h3 className="mt-3 text-2xl font-semibold">Prezent, który rozwija przez cały miesiąc</h3>
            <p className="mt-2 flex-1 text-muted">Podaruj wnuczkowi dostęp do codziennych personalizowanych bajek. Każdego dnia pozna nowe słowo, a w historiach może pojawiać się również babcia, dziadek i inni bliscy.</p>
            <p className="mt-4 font-display text-2xl font-semibold text-navy">od 39,90 zł <span className="text-base font-normal text-muted">za miesiąc</span></p>
            <p className="text-sm text-muted">Płatność jednorazowa, bez automatycznego odnowienia.</p>
            <Link href="/dla-dziadkow/kup" className={cn(buttonVariants({ size: "md", variant: "navy" }), "mt-4")}>Podaruj codzienne bajki</Link>
          </Card>
        </div>
      </section>

      <section className="container-page max-w-2xl py-12">
        <GiftCreator />
      </section>

      <section className="container-page max-w-3xl py-12">
        <SectionTitle title="Jak to działa?" />
        <ol className="mt-8 space-y-4">
          {[
            ["Wpisz imiona", "Imię wnuka i swoje — tyle wystarczy."],
            ["Elofik przygotuje bajkę", "Około 2 minut opowieści, w której pojawicie się razem."],
            ["Wyślij link rodzicom", "Przez WhatsApp, SMS albo e-mail. Link jest prywatny i wygasa po 30 dniach."],
          ].map(([t, d], i) => (
            <li key={t} className="card-soft flex gap-4 p-5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold font-display text-lg font-bold text-navy">{i + 1}</span>
              <div><p className="font-display text-lg font-semibold text-navy">{t}</p><p className="text-muted">{d}</p></div>
            </li>
          ))}
        </ol>
      </section>
      <SiteFooter />
    </div>
  );
}
