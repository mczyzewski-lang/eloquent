import Link from "next/link";
import { Gift, Heart, Send, Sparkles as SparklesIcon, Wand2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/Header";
import { GiftCreator } from "@/components/gifts/GiftCreator";
import { GrandparentsIllustration } from "@/components/gifts/GrandparentsIllustration";
import { SectionTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { cn } from "@/lib/utils";
import { getLandingArt } from "@/lib/services/mascots";
import { Fireflies, ForestHills, Moon, Ornament, Sparkles, StarField, StoryFrame, Wave } from "@/components/landing/Magic";

export const metadata = {
  title: "Prezent od babci i dziadka",
  description: "Podaruj wnukowi bajkę, w której wystąpicie razem. Bezpłatna niespodzianka albo miesiąc codziennych bajek z Elofikiem w prezencie.",
  alternates: { canonical: "/dla-dziadkow" },
};

export default async function GrandparentsPage({ searchParams }: { searchParams: Promise<{ anulowano?: string }> }) {
  const sp = await searchParams;
  const art = await getLandingArt().catch(() => ({}) as Record<string, string>);
  return (
    <div className="bg-cream">
      <PageView event="grandparents_landing_viewed" />
      <SiteHeader variant="grandparents" />

      {/* HERO — ciepły wieczór, jak przy czytaniu bajki na dobranoc */}
      <section className="sky-twilight relative overflow-hidden text-cream">
        <StarField count={60} seed={29} className="h-[70%]" />
        <Moon className="absolute right-[5%] top-6 w-16 sm:w-24" />
        <Fireflies count={14} seed={12} />
        <div className="container-page relative grid items-center gap-8 pb-4 pt-10 lg:grid-cols-2 lg:gap-12 lg:pt-16">
          <div className="text-center lg:text-left">
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">Dla babci i dziadka</p>
            <h1 className="text-glow mt-3 text-4xl font-semibold leading-tight !text-cream sm:text-5xl">
              Podaruj wnuczkowi bajkę, w której <span className="text-gold">wystąpicie razem</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-cream/85 lg:mx-0">
              Stwórz bezpłatną opowieść, w której Elofik zabierze Twojego wnuka w magiczną przygodę. A jeśli chcesz, możesz podarować mu coś więcej — codzienne bajki rozwijające słownictwo, wyobraźnię i ciekawość świata.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <a href="#kreator" className={buttonVariants({ size: "lg" })}><Gift className="h-5 w-5" /> Stwórz bezpłatną niespodziankę</a>
              <Link href="/dla-dziadkow/kup" className={buttonVariants({ size: "lg", variant: "soft" })}>Podaruj codzienne bajki</Link>
            </div>
            {sp.anulowano && <p className="mt-4 rounded-2xl bg-peach p-3 text-sm text-navy">Płatność została przerwana — nic nie pobraliśmy.</p>}
          </div>
          {art.family ? (
            <StoryFrame src={art.family} alt="Elofik opowiada bajkę babci, dziadkowi i wnukowi" className="aspect-[3/2] w-full" />
          ) : (
            <GrandparentsIllustration />
          )}
        </div>
        <ForestHills to="#fff9f0" className="relative" />
      </section>

      {/* Dwie możliwości */}
      <section className="paper-grain relative overflow-hidden">
        <Sparkles count={7} seed={41} />
        <div className="container-page relative py-16">
          <SectionTitle eyebrow="Dwie możliwości" title="Wybierz swój prezent" />
          <Ornament className="mt-4" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="storybook-card flex flex-col p-7 sm:-rotate-1">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-peach"><Heart className="h-6 w-6 text-peach-deep" /></span>
              <h3 className="mt-4 text-2xl font-semibold">Mała niespodzianka, wielki uśmiech</h3>
              <p className="mt-2 flex-1 text-muted">Stwórz krótką bajkę, w której Elofik wymieni imię wnuka i Twoje. Wyślij link rodzicom i podaruj dziecku chwilę radości.</p>
              <p className="mt-4 font-display text-2xl font-semibold text-sage-deep">Bezpłatnie</p>
              <a href="#kreator" className={cn(buttonVariants({ size: "md" }), "relative z-10 mt-4")}>Stwórz niespodziankę</a>
            </div>
            <div className="sky-night relative flex flex-col overflow-hidden rounded-[var(--radius-2xl)] p-7 text-cream shadow-[0_0_0_2px_rgb(246_199_109/0.6),0_20px_50px_-20px_rgb(28_39_71/0.7)] sm:rotate-1">
              <StarField count={26} seed={51} className="opacity-70" />
              <div className="relative flex flex-1 flex-col">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/25"><SparklesIcon className="h-6 w-6 text-gold" /></span>
                <h3 className="mt-4 text-2xl font-semibold !text-cream">Prezent, który rozwija przez cały miesiąc</h3>
                <p className="mt-2 flex-1 text-cream/80">Podaruj wnuczkowi dostęp do codziennych personalizowanych bajek. Każdego dnia pozna nowe słowo, a w historiach może pojawiać się również babcia, dziadek i inni bliscy.</p>
                <p className="mt-4 font-display text-2xl font-semibold text-gold">od 39,90 zł <span className="text-base font-normal text-cream/70">za miesiąc</span></p>
                <p className="text-sm text-cream/70">Płatność jednorazowa, bez automatycznego odnowienia.</p>
                <Link href="/dla-dziadkow/kup" className={cn(buttonVariants({ size: "md" }), "mt-4")}>Podaruj codzienne bajki</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kreator niespodzianki */}
      <section className="relative overflow-x-clip"><div className="container-page relative max-w-2xl py-12">
        <div className="relative">
          <div className="hidden" aria-hidden />
          <div className="storybook-card relative p-2 [&_form]:bg-transparent [&_form]:shadow-none">
            <GiftCreator />
          </div>
        </div>
      </div>
      </section>

      {/* Jak to działa */}
      <Wave from="#fff9f0" to="#1b2540" />
      <section className="sky-night relative overflow-hidden py-16 text-cream">
        <StarField count={60} seed={61} />
        <Fireflies count={8} seed={71} />
        <div className="container-page relative max-w-4xl">
          <p className="text-center font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">Trzy proste kroki</p>
          <h2 className="text-glow mt-3 text-center text-3xl font-semibold !text-cream sm:text-4xl">Jak to działa?</h2>
          <Ornament light className="mt-4" />
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Heart, t: "Wpisz imiona", d: "Imię wnuka i swoje — tyle wystarczy." },
              { icon: Wand2, t: "Elofik przygotuje bajkę", d: "Około 2 minut opowieści, w której pojawicie się razem." },
              { icon: Send, t: "Wyślij link rodzicom", d: "Przez WhatsApp, SMS albo e-mail. Link jest prywatny i wygasa po 30 dniach." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="relative rounded-[var(--radius-2xl)] border border-gold/30 bg-white/5 p-6 pt-9 backdrop-blur-sm">
                <span className="absolute -top-5 left-6 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-gold to-gold-deep font-display text-lg font-bold text-navy shadow-[0_0_0_4px_#26344a,0_0_24px_rgb(246_199_109/0.6)]">{i + 1}</span>
                <Icon className="h-6 w-6 text-gold" aria-hidden />
                <p className="mt-3 font-display text-lg font-semibold text-cream">{t}</p>
                <p className="mt-1 text-cream/75">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <a href="#kreator" className={buttonVariants({ size: "lg" })}><Gift className="h-5 w-5" /> Stwórz bezpłatną niespodziankę</a>
          </div>
        </div>
      </section>
      <ForestHills to="#fff9f0" className="-mt-px bg-[#2a3a5e]" />

      <SiteFooter />
    </div>
  );
}
