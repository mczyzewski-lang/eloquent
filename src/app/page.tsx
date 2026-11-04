import Link from "next/link";
import { BookOpenText, Ear, Gift, Headphones, Heart, MessageCircleHeart, MonitorOff, Moon, Sparkles as SparklesIcon, Sun, Users } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/Header";
import { SampleExperience } from "@/components/landing/SampleExperience";
import { StoryCover } from "@/components/elofik/StoryCover";
import { Elofik } from "@/components/elofik/Elofik";
import { Card, SectionTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { Faq } from "@/components/landing/Faq";
import { PREMIUM_FEATURES } from "@/lib/domain/pricing";
import { STORY_CATALOG } from "@/content/stories";
import { cn } from "@/lib/utils";
import { getCoverMap } from "@/lib/services/illustrations";
import { getLandingArt } from "@/lib/services/mascots";
import { Fireflies, ForestHills, Moon as MoonArt, Ornament, Sparkles, StarField, StoryFrame, Wave } from "@/components/landing/Magic";

export const revalidate = 300; // okładki z panelu pojawiają się bez nowego wdrożenia

export default async function LandingPage() {
  const [covers, art] = await Promise.all([getCoverMap().catch(() => ({}) as Record<string, string>), getLandingArt().catch(() => ({}) as Record<string, string>)]);
  const samples = STORY_CATALOG.slice(0, 3);
  const week = STORY_CATALOG.slice(0, 7);
  return (
    <div className="bg-cream">
      <PageView event="landing_viewed" />
      <SiteHeader />

      {/* HERO — zmierzch w zaczarowanym lesie */}
      <section className="sky-twilight relative overflow-hidden text-cream">
        {art.hero && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art.hero} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c2747]/95 via-[#1c2747]/70 to-[#1c2747]/10" aria-hidden />
          </>
        )}
        <StarField count={70} seed={5} className="h-[70%]" />
        <MoonArt className="absolute right-[6%] top-6 w-20 sm:w-28" />
        <Fireflies count={16} />
        <div className="container-page relative grid items-center gap-6 pb-6 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-16">
          <div className="text-center lg:text-left">
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">Elofik — codziennie jedno mądre słowo</p>
            <h1 className="text-glow mt-3 text-[2rem] font-semibold leading-[1.12] !text-cream sm:text-5xl lg:text-[3.5rem]">
              A gdyby Twoje dziecko każdego dnia poznawało jedno nowe, <span className="text-gold">mądre słowo</span>?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cream/85 sm:text-lg lg:mx-0">
              Poznaj Elofika. Małego elfa opowieści, który każdego dnia zabiera Twoje dziecko w magiczną przygodę. Piękne słuchowiska, nowe słowa i historie, w których Twoje dziecko staje się częścią opowieści.
            </p>
            <ul className="mx-auto mt-6 hidden max-w-xl flex-wrap justify-center gap-2 text-sm font-semibold sm:flex lg:mx-0 lg:justify-start">
              {["Bajki 5–10 minut", "Dla dzieci 4–7 lat", "Bez patrzenia w ekran", "Imię dziecka w historii"].map((t) => (
                <li key={t} className="rounded-full border border-gold/40 bg-white/10 px-3 py-1.5 text-cream backdrop-blur-sm">✦ {t}</li>
              ))}
            </ul>
          </div>
          <div id="probka" className="scroll-mt-20">
            <SampleExperience />
          </div>
        </div>
        <ForestHills to="#fff9f0" className="relative" />
      </section>

      {/* 1. Jak działa */}
      <section className="paper-grain relative">
      <Sparkles count={7} seed={21} />
      <div className="container-page relative py-16">
        <SectionTitle eyebrow="Jak działa Elofik" title="Trzy kroki do codziennego rytuału" />
        <Ornament className="mt-4" />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Users, mood: "hug" as const, title: "Przedstaw nam swoją rodzinę", text: "Imię dziecka, a jeśli chcesz — mamy, taty, dziadków, rodzeństwa i zwierzaka. Wszystko opcjonalne, zajmie minutę." },
            { icon: Sun, mood: "reading" as const, title: "Każdego dnia nowa przygoda", text: "O 6:00 rano odblokowuje się kolejna bajka. Jedna dziennie, 5–10 minut, z jednym mądrym słowem w roli głównej." },
            { icon: Ear, mood: "hello" as const, title: "„Hej Elofik!” i słuchamy", text: "Dziecko woła Elofika, a on odpowiada po imieniu i zaczyna opowieść. Ekran można odłożyć — liczy się słuchanie." },
          ].map((s, i) => (
            <div key={s.title} className="storybook-card relative p-6 pt-10">
              <span className="absolute -top-5 left-6 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-gold to-gold-deep font-display text-lg font-bold text-navy shadow-[0_0_0_4px_#fff9f0,0_8px_20px_-6px_rgb(233_172_60/0.8)]">{i + 1}</span>
              <div className="flex h-28 items-end"><Elofik mood={s.mood} className="h-28 w-auto [&_img]:h-28 [&_img]:w-auto" /></div>
              <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
      </section>

      {/* 2. Przykładowe bajki */}
      <section className="container-page py-16">
        <SectionTitle eyebrow="Przykładowe bajki" title="Przygody, w których słowa nabierają znaczenia" />
        <Ornament className="mt-4" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {samples.map((s, i) => (
            <article key={s.storyId} className={cn("storybook-card overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1 hover:rotate-0", i === 0 && "sm:-rotate-1", i === 2 && "sm:rotate-1")}>
              <StoryCover day={s.dayNumber} title={s.title} word={s.wordOfDay} imageUrl={covers[s.storyId]} className="aspect-[4/3] rounded-none" />
              <div className="p-5">
                <p className="text-sm font-bold uppercase tracking-wide text-gold-deep">Dzień {s.dayNumber} · {s.estimatedMinutes} min</p>
                <p className="mt-2 leading-relaxed text-muted">{s.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Jak uczymy nowych słów */}
      <section className="container-page py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle className="text-left lg:mx-0 lg:text-left" eyebrow="Jak uczymy nowych słów" title="Słowo poznaje się w przygodzie, nie w ławce" />
            <ul className="mt-8 space-y-5">
              {[
                ["Jedno słowo na bajkę", "Każda historia ma jedno główne słowo — np. dociekliwość, cierpliwość, wytrwałość."],
                ["Kilka spotkań ze słowem", "Słowo pojawia się kilka razy, w różnych sytuacjach i zachowaniach bohaterów."],
                ["Proste, ciepłe wyjaśnienie", "Elofik krótko tłumaczy znaczenie — bez szkolnego tonu, na przykładach z życia dziecka."],
                ["Powtórki", "W kolejnych dniach wracają słowa z poprzednich przygód, żeby mogły się utrwalić."],
                ["Pytanie dla rodzica", "Po bajce dostajesz jedno pytanie, od którego można zacząć krótką rozmowę."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold/25"><BookOpenText className="h-4 w-4 text-gold-deep" /></span>
                  <div>
                    <p className="font-display text-lg font-semibold text-navy">{t}</p>
                    <p className="text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
          {art.words && <StoryFrame src={art.words} alt="Elofik wypuszcza z torby na słowa świecące nowe słowo" className="aspect-[3/2]" />}
          <Card className="sky-night relative overflow-hidden text-cream">
            <StarField count={24} seed={9} className="opacity-60" />
            <div className="relative">
            <p className="text-sm font-bold uppercase tracking-wide text-gold">Po bajce</p>
            <p className="mt-3 font-display text-3xl font-semibold text-cream">Dzisiaj poznaliśmy słowo: DOCIEKLIWOŚĆ!</p>
            <p className="mt-4 leading-relaxed text-cream/80">{STORY_CATALOG[0].wordDefinition}</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-gold"><MessageCircleHeart className="h-4 w-4" /> Zapytaj dziecko</p>
              <p className="mt-1 text-lg">„{STORY_CATALOG[0].parentQuestion}”</p>
            </div>
            </div>
          </Card>
          </div>
        </div>
      </section>

      {/* 4. Personalizacja */}
      <section className="container-page py-16">
        <SectionTitle
          eyebrow="Personalizacja"
          title="Gdy w bajce pada własne imię, słucha się inaczej"
          subtitle="Dzieci uwielbiają słyszeć swoje imię i imiona bliskich — historia staje się „ich”. Elofik zwraca się do dziecka po imieniu, a w przygodach mogą pojawić się mama, tata, babcia, dziadek, rodzeństwo czy pies. Nie obiecujemy cudów — dajemy dziecku powód, żeby chciało wrócić jutro."
        />
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {[
            "— Dzień dobry, Leonku! — zawołał radośnie Elofik. — Jak dobrze, że jesteś.",
            "— Kiedy coś mnie zastanawia, przypominam sobie, co mówi mama Monika: że najlepsze odkrycia zaczynają się od pytania.",
            "Elofik przypomniał sobie też, jak babcia Basia zawsze powtarza, że kto pyta, ten nie błądzi.",
          ].map((q, i) => (
            <p key={i} className={cn("storybook-card px-7 py-5 font-display text-lg leading-relaxed text-navy", i % 2 ? "ml-6 !bg-peach/70" : "mr-6")}>{q}</p>
          ))}
        </div>
      </section>

      {/* 5. Przykładowy tydzień */}
      <section className="container-page py-16">
        <SectionTitle eyebrow="Przykładowy tydzień z Elofikiem" title="Siedem dni, siedem mądrych słów" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {week.map((s) => (
            <div key={s.storyId} className="storybook-card p-3 text-center">
              <StoryCover day={s.dayNumber} compact imageUrl={covers[s.storyId]} className="aspect-square" />
              <p className="mt-2 text-xs font-bold uppercase text-muted">Dzień {s.dayNumber}</p>
              <p className="font-display font-semibold capitalize text-navy">{s.wordOfDay}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Rytuał */}
      <Wave from="#fff9f0" to="#1b2540" />
      <section className="sky-night relative overflow-hidden py-20 text-cream">
        <StarField count={80} seed={13} />
        <MoonArt className="absolute left-[4%] top-8 w-16 opacity-80 sm:w-24" />
        <Fireflies count={10} seed={8} />
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-2">
          {art.ritual ? (
            <StoryFrame src={art.ritual} alt="Elofik nasłuchuje, przykładając dłoń do ucha" arch className="mx-auto aspect-[4/5] w-full max-w-sm" />
          ) : (
            <div className="relative mx-auto w-56 sm:w-72">
              <Elofik mood="listening" />
            </div>
          )}
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">Codzienny rytuał</p>
            <h2 className="text-glow mt-3 text-4xl font-semibold !text-cream">„Hej Elofik!”</h2>
            <p className="mt-5 text-lg leading-relaxed text-cream/85">
              Zanim zacznie się bajka, dziecko woła Elofika. Elf nastawia swoje wielkie uszy, a gdy usłyszy powitanie — ożywia się, uśmiecha i odpowiada po imieniu: „Heeej, Leonku! Ale się cieszę, że znowu jesteś!”. Ta chwila buduje nawyk i poczucie bliskości z bohaterem.
            </p>
            <ul className="mt-6 space-y-2 text-cream/80">
              <li>• Mikrofon włącza się tylko po dotknięciu przycisku i tylko na kilka sekund.</li>
              <li>• Nie nagrywamy i nie przechowujemy głosu dziecka.</li>
              <li>• Nie działa? Bajkę zawsze można włączyć jednym dotknięciem.</li>
            </ul>
          </div>
        </div>
      </section>
      <Wave from="#fff9f0" to="#2a3a5e" flip />

      {/* 7–8. Słownictwo i bez ekranu */}
      <section className="container-page grid gap-6 py-16 lg:grid-cols-2">
        <Card className="storybook-card">
          <Elofik mood="reading" className="w-24" />
          <h3 className="mt-3 text-2xl font-semibold">Czym jest rozwijanie słownictwa przez opowieści?</h3>
          <p className="mt-3 leading-relaxed text-muted">
            Dzieci uczą się nowych słów przede wszystkim, słuchając ich w ciekawym kontekście — w rozmowie, w zabawie, w historii. Bajka daje słowu emocje, bohaterów i sytuację, którą łatwo zapamiętać. Elofik nie zastąpi rozmowy z rodzicem — daje do niej pretekst.
          </p>
        </Card>
        <Card className="storybook-card">
          <Elofik mood="music" className="w-24" />
          <h3 className="mt-3 text-2xl font-semibold">Bajki bez patrzenia w ekran</h3>
          <p className="mt-3 leading-relaxed text-muted">
            Elofik to słuchowisko. Po powitaniu możesz odłożyć telefon ekranem w dół albo zgasić ekran — opowieść gra dalej, także w tle. Wyobraźnia dziecka maluje resztę. Świetnie sprawdza się przed snem, w aucie i przy wieczornym przytulaniu.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-navy"><Moon className="h-4 w-4" /> Spokojne tempo, ciepły głos, bez reklam.</p>
        </Card>
      </section>

      {/* 9. Dla rodziców i dziadków */}
      <section className="container-page py-16">
        <SectionTitle eyebrow="Dla rodziców i dziadków" title="Bliskość, która zostaje w pamięci" />
        <Ornament className="mt-4" />
        {art.family && <StoryFrame src={art.family} alt="Elofik opowiada bajkę babci, dziadkowi i wnukowi" className="mx-auto mt-10 aspect-[3/2] max-w-3xl" />}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="storybook-card">
            <Elofik mood="love" className="w-20" />
            <h3 className="mt-3 text-xl font-semibold">Dla rodziców</h3>
            <p className="mt-2 text-muted">Prosty, codzienny rytuał, który zajmuje kilka minut. Bez szukania, wybierania i przewijania — dzisiejsza bajka jest zawsze gotowa.</p>
          </Card>
          <Card className="storybook-card">
            <Elofik mood="hug" className="w-24" />
            <h3 className="mt-3 text-xl font-semibold">Dla babci i dziadka</h3>
            <p className="mt-2 text-muted">Stwórz bezpłatną bajkę, w której wystąpicie razem z wnukiem, albo podaruj miesiąc codziennych przygód.</p>
            <Link href="/dla-dziadkow" className={cn(buttonVariants({ variant: "soft", size: "sm" }), "mt-4")}>Zobacz prezent od dziadków</Link>
          </Card>
        </div>
      </section>

      {/* 10. Cena */}
      <section className="container-page py-16" id="cena">
        <SectionTitle eyebrow="Abonament" title="Elofik Premium" />
        <div className="mx-auto mt-10 max-w-md">
          <Card className="storybook-card relative overflow-hidden text-center">
            <Sparkles count={5} seed={33} className="opacity-70" />
            <p className="font-display text-5xl font-semibold text-navy">39,90 zł</p>
            <p className="text-muted">brutto miesięcznie · anulujesz w każdej chwili</p>
            <ul className="mt-6 space-y-2 text-left">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2"><SparklesIcon className="mt-1 h-4 w-4 flex-none text-gold-deep" />{f}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">Pierwsza bajka jest bezpłatna po założeniu profilu dziecka.</p>
            <Link href="#probka" className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}><Headphones className="h-5 w-5" /> Zacznij od darmowej próbki</Link>
          </Card>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="container-page py-16">
        <div className="mx-auto w-24"><Elofik mood="thinking" /></div>
        <SectionTitle eyebrow="FAQ" title="Najczęstsze pytania" />
        <Faq />
      </section>

      {/* 12. Końcowy CTA — dobranoc w lesie */}
      <section className="container-page py-16">
        <div className="sky-night relative overflow-hidden rounded-[2.25rem] px-6 pb-0 pt-12 text-center text-cream">
          {art.goodnight && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art.goodnight} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1b2540]/85 via-[#1b2540]/40 to-transparent" aria-hidden />
            </>
          )}
          <StarField count={40} seed={17} className="h-2/3" />
          <Fireflies count={10} seed={4} />
          <div className="relative">
            {!art.goodnight && <div className="mx-auto w-32"><Elofik mood="hello" /></div>}
            <h2 className="text-glow mt-4 text-3xl font-semibold !text-cream sm:text-4xl">Elofik już nastawia uszy</h2>
            <p className="mx-auto mt-3 max-w-lg text-lg text-cream/85">Wpisz imię dziecka i posłuchaj, jak brzmi jego pierwsza przygoda.</p>
            <Link href="#probka" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>Posłuchaj darmowej próbki</Link>
          </div>
          <ForestHills to="transparent" className={cn("relative mt-10", art.goodnight && "opacity-0")} />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
