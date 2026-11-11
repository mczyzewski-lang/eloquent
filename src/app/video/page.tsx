import Link from "next/link";
import { Download } from "lucide-react";
import { SiteHeader } from "@/components/site/Header";
import { CopyBlock } from "@/components/video/CopyBlock";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Reklama wideo Elofika",
  description: "Reklama wideo Elofika do pobrania (MP4): format pionowy 9:16 i 4:5.",
  robots: { index: false, follow: false },
};

const VIDEOS = [
  { id: "9x16", title: "Pionowy 9:16", use: "Reels, Stories (Instagram i Facebook)", size: "1080 × 1920 · 25 s", w: 1080, h: 1920 },
  { id: "4x5", title: "Feed 4:5", use: "Aktualności na Facebooku i Instagramie", size: "1080 × 1350 · 25 s", w: 1080, h: 1350 },
] as const;

const PRIMARY = [
  `„Hej, Leonku!” — wyobraź sobie minę swojego dziecka, kiedy bajka mówi do niego po imieniu. 💛

Elofik to codzienne bajki do słuchania dla dzieci 4–7 lat. 5–10 minut przed snem, bez patrzenia w ekran. W każdej historii jedno mądre słowo — i Wasza rodzina: mama, tata, babcia, dziadek, a nawet pies.

Pierwsza bajka jest za darmo. Wpisz imię dziecka i posłuchaj.`,
  `Znowu „jeszcze jedna bajka” na tablecie przed snem?

Zamieńcie ekran na 5 minut słuchania. Elofik — mały elf opowieści — codziennie zabiera dziecko w nową przygodę i uczy jednego mądrego słowa. Zwraca się do dziecka po imieniu, a w bajce występują Wasi bliscy.

A potem słyszysz przy kolacji: „Mamo, a co to znaczy dociekliwość?”.

Sprawdź pierwszą bajkę za darmo 👉 elofik.com`,
  `Dzieci uwielbiają słyszeć swoje imię. A co, jeśli usłyszą je w bajce na dobranoc?

✨ codziennie nowa przygoda (5–10 min)
✨ jedno mądre słowo dziennie
✨ imię dziecka i bliskich w historii
✨ do słuchania — ekran można odłożyć

Pierwsza bajka Elofika gratis.`,
];
const HEADLINES = ["Bajka, która zna imię Twojego dziecka", "5 minut słuchania zamiast ekranu przed snem", "Codziennie jedno mądre słowo — pierwsza bajka gratis"];
const DESCRIPTIONS = ["Dla dzieci 4–7 lat. Pierwsza bajka za darmo.", "Personalizowane bajki do słuchania. Bez ekranu."];

/** Publiczna strona z reklamą do pobrania (bez logowania). */
export default function VideoPage() {
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-5xl py-8">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">Materiały reklamowe</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Reklama wideo Elofika dla Meta</h1>
        <p className="mt-3 max-w-2xl text-muted">25 sekund, dwa formaty. Reklama działa bez dźwięku (cały przekaz jest w napisach), a z dźwiękiem gra spokojny motyw Elofika. Pobierz plik MP4 i wgraj go w Menedżerze reklam.</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {VIDEOS.map((v) => (
            <section key={v.id} className="card-soft p-4">
              <h2 className="text-xl font-semibold">{v.title}</h2>
              <p className="text-sm text-muted">{v.use} · {v.size}</p>
              <video className="mx-auto mt-3 w-full max-w-[320px] rounded-2xl bg-navy" style={{ aspectRatio: `${v.w} / ${v.h}` }} src={`/video/elofik-reklama-${v.id}.mp4`} poster={`/video/elofik-reklama-${v.id}.jpg`} controls playsInline preload="metadata" />
              <a href={`/video/elofik-reklama-${v.id}.mp4`} download={`elofik-reklama-${v.id}.mp4`} className={cn(buttonVariants({ size: "md" }), "mt-4 w-full")} data-testid={`download-${v.id}`}>
                <Download className="h-5 w-5" /> Pobierz MP4 ({v.title})
              </a>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Teksty do reklamy</h2>
          <p className="mt-1 text-muted">Trzy warianty tekstu głównego do testów A/B, nagłówki i opisy. Przycisk w reklamie: „Dowiedz się więcej” albo „Zarejestruj się”. Link: <Link href="/" className="underline">elofik.com</Link>.</p>
          <div className="mt-5 grid gap-4">
            {PRIMARY.map((t, i) => <CopyBlock key={i} label={`Tekst główny — wariant ${i + 1}`} text={t} />)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {HEADLINES.map((t, i) => <CopyBlock key={i} label={`Nagłówek ${i + 1}`} text={t} />)}
            {DESCRIPTIONS.map((t, i) => <CopyBlock key={i} label={`Opis ${i + 1}`} text={t} />)}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-white p-5 shadow-[inset_0_0_0_2px_rgb(59_42_31/0.14)]">
          <h2 className="text-xl font-semibold">Scenariusz reklamy</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-navy">
            <li><strong>0–3,5 s — hak:</strong> „Hej, Leonku!” — a gdyby bajka znała imię Twojego dziecka?</li>
            <li><strong>3,5–8 s — problem i zmiana:</strong> znowu bajka na ekranie przed snem → 5 minut słuchania.</li>
            <li><strong>8–13 s — wartość:</strong> codziennie nowa przygoda i jedno mądre słowo.</li>
            <li><strong>13–17,5 s — personalizacja:</strong> w bajce występuje cała rodzina.</li>
            <li><strong>17,5–21 s — emocja:</strong> „Mamo, a co to znaczy dociekliwość?” — bliskość, którą pamięta się latami.</li>
            <li><strong>21–25 s — wezwanie:</strong> pierwsza bajka za darmo, elofik.com.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
