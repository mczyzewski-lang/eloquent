/**
 * Reklama Elofika (Meta: Reels/Stories 9:16 oraz feed 4:5) — animacja napisana kodem.
 * Czysta funkcja czasu `t` (sekundy): ten sam komponent służy do podglądu na żywo
 * i do renderowania klatek do pliku MP4 (scripts/render-ad.ts).
 *
 * Scenariusz (emocja → wartość → wezwanie):
 *  1. Hak: bajka mówi do dziecka po imieniu.
 *  2. Problem rodzica: kolejna bajka na ekranie przed snem.
 *  3. Rozwiązanie: 5 minut słuchania — codziennie przygoda i jedno mądre słowo.
 *  4. Personalizacja: w bajce występuje cała rodzina.
 *  5. Emocja: „Mamo, a co to znaczy dociekliwość?” — słowa i bliskość, które zostają.
 *  6. Wezwanie: pierwsza bajka za darmo, elofik.com.
 */
import type { CSSProperties } from "react";

export const AD_DURATION = 25;
export const AD_W = 1080;
export const AD_FORMATS = { "9x16": 1920, "4x5": 1350 } as const;
export type AdFormat = keyof typeof AD_FORMATS;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const out3 = (k: number) => 1 - (1 - k) ** 3;
/** wejście „z pyknięciem” (lekkie przestrzelenie) */
const pop = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2);
/** widoczność sceny: płynne wejście i wyjście */
const scene = (t: number, a: number, b: number, f = 0.35) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

const NAVY = "#223058";
const INK = "#3b2a1f";
const CREAM = "#fff6e6";
const GOLD = "#f6c34d";
const display: CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 700, lineHeight: 1.08 };

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const STARS = (() => { const r = rng(4); return Array.from({ length: 46 }, () => ({ x: r() * 100, y: r() * 100, s: 3 + r() * 5, k: r() * 6 })); })();

function Stars({ t, o = 1 }: { t: number; o?: number }) {
  return (
    <>
      {STARS.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: 99, background: "#fff6c9", opacity: o * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + s.k))) }} />
      ))}
    </>
  );
}

/** Element pojawiający się z dołu z „pyknięciem”. */
function Pop({ t, at, children, style, dur = 0.5, from = 60 }: { t: number; at: number; children: React.ReactNode; style?: CSSProperties; dur?: number; from?: number }) {
  const k = seg(t, at, at + dur);
  return <div style={{ ...style, opacity: clamp(k * 3), transform: `${style?.transform ?? ""} translateY(${(1 - out3(k)) * from}px) scale(${0.6 + 0.4 * pop(k)})` }}>{children}</div>;
}

function Elofik({ pose, h, style }: { pose: string; h: number; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brand/elofik/emocje/${pose}.webp`} alt="" style={{ height: h, width: "auto", display: "block", ...style }} />;
}

function Bubble({ children, style, tail = "left" }: { children: React.ReactNode; style?: CSSProperties; tail?: "left" | "right" | "none" }) {
  return (
    <div style={{ position: "relative", display: "inline-block", background: "#fffdf6", color: NAVY, borderRadius: 48, padding: "26px 44px", boxShadow: `inset 0 0 0 5px ${INK}, 0 10px 0 rgba(20,26,50,.35)`, ...display, fontSize: 60, ...style }}>
      {children}
      {tail !== "none" && <div style={{ position: "absolute", bottom: -30, [tail]: 90, width: 44, height: 44, background: "#fffdf6", transform: "rotate(45deg)", boxShadow: `5px 5px 0 0 ${INK}` }} />}
    </div>
  );
}

function Sticker({ pose, word, day, bg, rot }: { pose: string; word: string; day: number; bg: string; rot: number }) {
  return (
    <div style={{ width: 300, background: "#fff", borderRadius: 44, padding: 18, boxShadow: `inset 0 0 0 5px ${INK}, 0 10px 0 rgba(59,42,31,.2)`, transform: `rotate(${rot}deg)`, textAlign: "center" }}>
      <div style={{ background: bg, borderRadius: 30, height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Elofik pose={pose} h={220} />
      </div>
      <div style={{ ...display, fontSize: 22, letterSpacing: "0.12em", color: "#8a8fa3", marginTop: 14 }}>DZIEŃ {day}</div>
      <div style={{ ...display, fontSize: 38, color: NAVY }}>{word}</div>
    </div>
  );
}

export function AdFilm({ t, format = "9x16" }: { t: number; format?: AdFormat }) {
  const H = AD_FORMATS[format];
  const tall = format === "9x16";
  /** scena: kolumna wyśrodkowana w strefie bezpiecznej (Reels zasłania górę i dół interfejsem) */
  const col = (opacity: number, extra?: CSSProperties): CSSProperties => ({
    position: "absolute", inset: 0, opacity, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: tall ? 56 : 30, padding: tall ? `${H * 0.13}px 60px ${H * 0.2}px` : "50px 60px 50px", textAlign: "center", ...extra,
  });
  const s1 = scene(t, -1, 3.7), s2a = scene(t, 3.5, 5.9), s2b = scene(t, 5.7, 8.2), s3 = scene(t, 8, 13.2), s4 = scene(t, 13, 17.7), s5 = scene(t, 17.5, 21.3), s6 = scene(t, 21.1, 99);
  const bob = Math.sin(t * 3) * 10;
  const night = "linear-gradient(180deg,#223058 0 60%,#2c3c6e 60% 100%)";
  const big = tall ? 1 : 0.8;

  return (
    <div style={{ position: "relative", width: AD_W, height: H, overflow: "hidden", background: NAVY, color: CREAM }}>
      {/* ---------- 1. HAK: bajka zna imię ---------- */}
      {s1 > 0 && (
        <div style={col(s1, { background: night, justifyContent: "space-between" })}>
          <Stars t={t} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: tall ? 50 : 26 }}>
            <Pop t={t} at={0.15}><Bubble tail="left" style={{ fontSize: 112 * big, padding: "38px 60px" }}>„Hej, <span style={{ color: "#d97a2e" }}>Leonku</span>!”</Bubble></Pop>
            <Pop t={t} at={1.15} style={{ ...display, fontSize: 88 * big, marginTop: 10 }}>A gdyby bajka znała<br /><span style={{ color: GOLD }}>imię Twojego dziecka</span>?</Pop>
          </div>
          <div style={{ transform: `translateY(${(1 - out3(seg(t, 0, 0.6))) * 600 + bob}px)` }}><Elofik pose="hello" h={tall ? 800 : 560} /></div>
        </div>
      )}

      {/* ---------- 2a. PROBLEM ---------- */}
      {s2a > 0 && (
        <div style={col(s2a, { background: "linear-gradient(180deg,#151d3a 0 62%,#1c2748 62% 100%)" })}>
          <Stars t={t} o={0.5} />
          <div style={{ width: 420 * big, height: 290 * big, borderRadius: 44, background: `rgba(160,200,255,${0.95 - seg(t, 4.7, 5.5) * 0.8})`, boxShadow: `inset 0 0 0 16px #0d142b, 0 0 ${140 - seg(t, 4.7, 5.5) * 140}px rgba(150,190,255,.85)`, transform: `scale(${pop(seg(t, 3.7, 4.2))}) rotate(-4deg)` }} />
          <Pop t={t} at={3.95} style={{ ...display, fontSize: 92 * big }}>Znowu „jeszcze<br />jedna bajka”<br />na ekranie?</Pop>
          <Pop t={t} at={4.6} style={{ fontSize: 50 * big, fontWeight: 700, opacity: 0.85 }}>Wieczór. Zmęczenie. Wyrzuty sumienia.</Pop>
        </div>
      )}

      {/* ---------- 2b. ROZWIĄZANIE ---------- */}
      {s2b > 0 && (
        <div style={col(s2b, { background: night, justifyContent: "space-between" })}>
          <Stars t={t} />
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <Pop t={t} at={5.9} style={{ ...display, fontSize: 96 * big }}>Zamieńcie ekran na<br /><span style={{ color: GOLD }}>5 minut słuchania</span></Pop>
            <Pop t={t} at={6.5} style={{ fontSize: 52 * big, fontWeight: 700, opacity: 0.92, lineHeight: 1.3 }}>Telefon leży ekranem w dół.<br />Resztę maluje wyobraźnia.</Pop>
          </div>
          <div style={{ transform: `translateY(${(1 - out3(seg(t, 5.9, 6.6))) * 300 + bob * 0.6}px)` }}><Elofik pose="music" h={tall ? 720 : 520} /></div>
        </div>
      )}

      {/* ---------- 3. WARTOŚĆ: przygoda i mądre słowo ---------- */}
      {s3 > 0 && (
        <div style={col(s3, { background: CREAM, color: NAVY })}>
          <Pop t={t} at={8.2} style={{ ...display, fontSize: 40 * big, letterSpacing: "0.2em", color: "#c98a12" }}>KAŻDEGO DNIA</Pop>
          <Pop t={t} at={8.35} style={{ ...display, fontSize: 96 * big, marginTop: -30, lineHeight: 1.32 }}>nowa przygoda<br />i jedno <span style={{ background: GOLD, borderRadius: 28, padding: "2px 22px 6px" }}>mądre słowo</span></Pop>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: tall ? 34 : 22, width: tall ? 960 : 1000, zoom: tall ? 1.42 : 1 }}>
            {[
              { pose: "detective", word: "dociekliwość", bg: "#fdebc0", rot: -4 },
              { pose: "building", word: "cierpliwość", bg: "#fbdcd0", rot: 3 },
              { pose: "hug", word: "odwaga", bg: "#dcecd6", rot: -2 },
            ].map((c, i) => (
              <Pop key={c.word} t={t} at={9.3 + i * 0.55} from={160}>
                <Sticker pose={c.pose} word={c.word} day={i + 1} bg={c.bg} rot={c.rot + Math.sin(t * 2 + i) * 1.2} />
              </Pop>
            ))}
          </div>
          <Pop t={t} at={11.3} style={{ fontSize: 50 * big, fontWeight: 800, color: "#5b6477" }}>Bajki 5–10 minut · dla dzieci 4–7 lat</Pop>
        </div>
      )}

      {/* ---------- 4. PERSONALIZACJA: cała rodzina ---------- */}
      {s4 > 0 && (
        <div style={col(s4, { background: "#fbe3d6", color: NAVY, gap: tall ? 44 : 22 })}>
          <Pop t={t} at={13.2} style={{ ...display, fontSize: 96 * big }}>W bajce występuje<br /><span style={{ color: "#c2541d" }}>cała Wasza rodzina</span></Pop>
          <Pop t={t} at={14.1} style={{ alignSelf: "flex-start" }}><Bubble style={{ fontSize: 60 * big, transform: "rotate(-2deg)" }}>„<b style={{ color: "#c2541d" }}>Mama Monika</b> zawsze mówi…”</Bubble></Pop>
          <Pop t={t} at={14.8} style={{ alignSelf: "flex-end", marginTop: 16 }}><Bubble tail="right" style={{ fontSize: 60 * big, transform: "rotate(2deg)" }}>„<b style={{ color: "#c2541d" }}>Babcia Basia</b> miała rację!”</Bubble></Pop>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%", marginTop: 16 }}>
            <Pop t={t} at={15.5}><Bubble style={{ fontSize: 60 * big, transform: "rotate(-1deg)" }}>„<b style={{ color: "#c2541d" }}>Burek</b> już merda!”</Bubble></Pop>
            <div style={{ transform: `translateY(${(1 - out3(seg(t, 13.4, 14))) * 300 + bob * 0.6}px)`, marginBottom: -30 }}><Elofik pose="love" h={tall ? 520 : 330} /></div>
          </div>
        </div>
      )}

      {/* ---------- 5. EMOCJA ---------- */}
      {s5 > 0 && (
        <div style={col(s5, { background: night })}>
          <Stars t={t} />
          <Pop t={t} at={17.7} style={{ fontSize: 56 * big, fontWeight: 800, opacity: 0.9 }}>A potem, przy kolacji:</Pop>
          <Pop t={t} at={18.1}><Bubble tail="left" style={{ fontSize: 92 * big, padding: "44px 54px" }}>„Mamo, a co to znaczy <span style={{ color: "#d97a2e" }}>dociekliwość</span>?”</Bubble></Pop>
          <Pop t={t} at={19.4} style={{ ...display, fontSize: 86 * big, marginTop: tall ? 60 : 30 }}>Słowa, które zostają.<br /><span style={{ color: GOLD }}>Bliskość, którą pamięta się latami.</span></Pop>
        </div>
      )}

      {/* ---------- 6. WEZWANIE ---------- */}
      {s6 > 0 && (
        <div style={col(s6, { background: CREAM, color: NAVY, gap: tall ? 44 : 20 })}>
          <Pop t={t} at={21.2} dur={0.6}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/elofik-logo.png" alt="Elofik" style={{ height: tall ? 640 : 400, width: "auto", display: "block", transform: `rotate(${Math.sin(t * 2) * 1.5}deg)` }} />
          </Pop>
          <Pop t={t} at={21.8} style={{ ...display, fontSize: 84 * big }}>Bajki, które mówią<br />do dziecka <span style={{ color: "#c2541d" }}>po imieniu</span></Pop>
          <Pop t={t} at={22.6}>
            <span style={{ display: "inline-block", background: GOLD, borderRadius: 999, padding: `${40 * big}px ${72 * big}px`, ...display, fontSize: 72 * big, boxShadow: `inset 0 0 0 5px ${INK}, 0 12px 0 ${INK}`, transform: `scale(${1 + Math.sin(t * 5) * 0.025})` }}>Pierwsza bajka za darmo</span>
          </Pop>
          <Pop t={t} at={23.1} style={{ ...display, fontSize: 80 * big, color: NAVY, marginTop: 10 }}>elofik.com</Pop>
        </div>
      )}
    </div>
  );
}
