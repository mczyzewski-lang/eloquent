/**
 * „Elofik i tajemniczy ślad” — krótki film animowany napisany w całości kodem.
 * Styl: teatrzyk z papierowych wycinanek (pastelowe warstwy z paralaksą), jedna ciągła
 * wędrówka kamery od świtu do nocy. Wszystko jest funkcją czasu `t` (sekundy) — dzięki temu
 * film można przewijać, zatrzymać w dowolnej klatce i renderować deterministycznie.
 */

export const DURATION = 84;
export const W = 1600;
export const H = 900;
export const GROUND = 705;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (k: number) => k * k * (3 - 2 * k);
/** 0→1 na odcinku [a,b] */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** 0→1→0: wejście na [a,a+fade], wyjście na [b-fade,b] */
export const window_ = (t: number, a: number, b: number, fade = 0.5) => Math.min(seg(t, a, a + fade), 1 - seg(t, b - fade, b));
export const bounceOut = (k: number) => {
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
  return n * (k -= 2.625 / d) * k + 0.984375;
};

export type Keys = [number, number][];
/** Interpolacja po klatkach kluczowych z wygładzeniem. */
export function key(t: number, keys: Keys, ease: (k: number) => number = smooth): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function mix(a: string, b: string, k: number): string {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(k)))).join(",")})`;
}
/** Kolor z klatek kluczowych. */
export function colorKey(t: number, keys: [number, string][]): string {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
}

/** Deterministyczny generator (te same „losowe” drzewa i świetliki przy każdym odtworzeniu). */
export function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------- scenariusz ----------------------------------------------------------

/** Pozycja Elofika w świecie (x). */
export const ELOFIK_X: Keys = [[0, 560], [7.6, 560], [9.2, 690], [17, 690], [21.5, 1820], [29, 1820], [33.5, 3110], [37, 3110], [39.3, 3560], [43, 3560], [47.5, 4540], [57, 4580], [62.5, 5900], [90, 5900]];
/** Kamera (x lewej krawędzi kadru). */
export const CAMERA_X: Keys = [[0, 0], [17, 0], [21.5, 1150], [29, 1210], [33.5, 2470], [37, 2540], [39.3, 2890], [43, 2940], [47.5, 3880], [57, 3960], [62.5, 5140], [84, 5260]];
/** Jeżyk-świetlik. */
export const HEDGEHOG_X: Keys = [[0, 4790], [50.4, 4790], [51.6, 4930], [57, 4930], [62.5, 6040], [90, 6040]];

export const STONE_X = 4760;
export const STREAM_X = 3300;
export const SQUIRREL_TREE_X = 3740;
export const OAK_X = 430;
export const MEADOW_X = 6000;

/** Srebrzyste ślady: pierwsze pojawiają się jeden po drugim, kolejne prowadzą aż pod kamień. */
export const FOOTPRINTS = Array.from({ length: 34 }, (_, i) => {
  const x = 1900 + i * 84 + (i > 15 ? 160 : 0);
  return { x, y: GROUND + 10 + (i % 2) * 12, at: i < 9 ? 19.6 + i * 0.36 : 0, rot: (i % 2 ? 14 : -14) };
}).filter((f) => Math.abs(f.x - STREAM_X - 100) > 150 && f.x < STONE_X - 120);

export const SKY_TOP: [number, string][] = [[0, "#b9b3e3"], [8, "#bfdcf3"], [42, "#bfe0f2"], [47, "#b9dccf"], [55, "#c8d8ee"], [60, "#f3b9a6"], [66, "#6f77c2"], [72, "#4b5aa6"]];
export const SKY_BOTTOM: [number, string][] = [[0, "#fbd3c0"], [8, "#fdf1dc"], [42, "#fdf3e1"], [47, "#eaf2d8"], [55, "#fde7c8"], [60, "#fbd49a"], [66, "#e9a9a0"], [72, "#8f8fd0"]];
/** Barwa „światła” nakładana na papier (mnożenie): dzień → zachód → noc. */
export const TINT: [number, string][] = [[0, "#e9dcf5"], [7, "#ffffff"], [43.5, "#ffffff"], [47.5, "#b9cfc6"], [50.2, "#b9cfc6"], [52, "#f4f8ee"], [56, "#ffffff"], [60, "#ffdcc4"], [67, "#9aa2e4"], [84, "#8f98e0"]];

export const CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: 7, to: 16.5, text: "Na skraju zaczarowanego lasu, w dziupli starego dębu, mieszkał mały elf opowieści. Nazywał się Elofik." },
  { from: 18.5, to: 28.5, text: "Pewnego ranka na mokrym mchu zalśniły malutkie, srebrzyste ślady. Kto je zostawił? I dlaczego świecą?" },
  { from: 30, to: 36.8, text: "Elofik poczuł dociekliwość — takie łaskotanie w głowie, które mówi: sprawdź, zapytaj, dowiedz się!" },
  { from: 37.2, to: 43, text: "Zapytał strumyk. Zapytał wiewiórkę. Dociekliwy ktoś nie poddaje się po pierwszym pytaniu." },
  { from: 44.5, to: 50, text: "Ślady zaprowadziły go pod wielki, omszały kamień. Spod kamienia sączyło się delikatne światło…" },
  { from: 50.6, to: 56.8, text: "Malutki jeżyk-świetlik! Na końcu każdego kolca świeciła mu iskierka. Zgubił drogę do domu." },
  { from: 57.4, to: 63.5, text: "— Co słyszałeś? Co czułeś pod łapkami? — pytał Elofik. Pytanie po pytaniu, krok po kroku…" },
  { from: 64, to: 71, text: "…aż znaleźli Polanę Świetlików. Pytania prowadzą do odpowiedzi, a odpowiedzi czasem prowadzą do domu." },
  { from: 71.6, to: 79, text: "A Elofik schował do torby nowe, błyszczące słowo." },
];

export type BubbleAnchor = "elofik" | "squirrel" | "hedgehog" | "stream";
export const BUBBLES: { id: string; from: number; to: number; text: string; anchor: BubbleAnchor }[] = [
  { id: "b1", from: 9.8, to: 13.2, text: "Dzień dobry, lesie!", anchor: "elofik" },
  { id: "b2", from: 23.2, to: 28.3, text: "Hmm… czyje to ślady?", anchor: "elofik" },
  { id: "b3", from: 34, to: 36.8, text: "blub, blub…", anchor: "stream" },
  { id: "b4", from: 40.2, to: 43, text: "Coś świeciło jak latarenka!", anchor: "squirrel" },
  { id: "b5", from: 51.8, to: 55, text: "Zgubiłem drogę do domu…", anchor: "hedgehog" },
  { id: "b6", from: 54, to: 57.2, text: "Znajdziemy ją razem!", anchor: "elofik" },
  { id: "b7", from: 65, to: 69.5, text: "Polana Świetlików!", anchor: "elofik" },
];

export const WORD = "dociekliwość";
