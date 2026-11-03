/**
 * Bajkowe dekoracje strony: nocne niebo, księżyc, świetliki, leśne wzgórza, falowane przejścia, ramki „z książki”.
 * Czyste SVG/CSS (bez obrazków) — lekkie, ostre na każdym ekranie, deterministyczne (bez losowości przy renderze).
 */
import { cn } from "@/lib/utils";

/** prosty, deterministyczny generator liczb (ta sama „losowość” na serwerze i w przeglądarce) */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function StarField({ count = 60, seed = 7, className }: { count?: number; seed?: number; className?: string }) {
  const r = rng(seed);
  const stars = Array.from({ length: count }, () => ({ x: r() * 100, y: r() * 100, s: 0.6 + r() * 1.6, d: r() * 4, big: r() > 0.9 }));
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden preserveAspectRatio="none">
      {stars.map((st, i) =>
        st.big ? (
          <svg key={i} x={`${st.x}%`} y={`${st.y}%`} overflow="visible">
            <path className="star-twinkle" style={{ animationDelay: `${st.d}s` }} d="M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4 Z" fill="#ffe7a8" />
          </svg>
        ) : (
          <circle key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.s} fill="#fff7e0" className="star-twinkle" style={{ animationDelay: `${st.d}s` }} />
        ),
      )}
    </svg>
  );
}

export function Moon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={cn("pointer-events-none", className)} aria-hidden>
      <defs>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3c4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff3c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#moon-glow)" />
      <circle cx="60" cy="60" r="26" fill="#fff4d6" />
      <circle cx="71" cy="52" r="24" fill="#2f3d63" opacity="0.92" />
    </svg>
  );
}

export function Fireflies({ count = 14, seed = 3, className }: { count?: number; seed?: number; className?: string }) {
  const r = rng(seed);
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="firefly"
          style={{ left: `${r() * 100}%`, top: `${30 + r() * 65}%`, animationDelay: `${r() * 6}s`, animationDuration: `${6 + r() * 6}s` }}
        />
      ))}
    </div>
  );
}

/** Warstwowe wzgórza z drzewami — dół nocnych sekcji. `to` = kolor sekcji poniżej (płynne przejście). */
export function ForestHills({ to = "#fff9f0", className }: { to?: string; className?: string }) {
  const tree = (x: number, base: number, h: number, fill: string, k: number) => (
    <g key={`${x}-${k}`} fill={fill}>
      <path d={`M${x},${base - h} L${x + h * 0.32},${base - h * 0.45} L${x + h * 0.18},${base - h * 0.45} L${x + h * 0.4},${base} L${x - h * 0.4},${base} L${x - h * 0.18},${base - h * 0.45} L${x - h * 0.32},${base - h * 0.45} Z`} />
    </g>
  );
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className={cn("pointer-events-none block h-[120px] w-full sm:h-[180px]", className)} aria-hidden>
      <path d="M0,120 C180,70 320,110 480,90 C660,66 760,120 960,96 C1140,74 1280,104 1440,84 L1440,220 L0,220 Z" fill="#33426b" />
      {[90, 210, 1210, 1330, 1390].map((x, i) => tree(x, 112 - (i % 2) * 6, 70 + (i % 3) * 14, "#33426b", i))}
      <path d="M0,160 C220,120 380,170 620,140 C820,116 1000,168 1200,140 C1320,124 1400,138 1440,134 L1440,220 L0,220 Z" fill="#283657" />
      {[40, 150, 300, 1080, 1170, 1270, 1400].map((x, i) => tree(x, 156 - (i % 2) * 8, 80 + (i % 3) * 18, "#283657", i + 10))}
      <path d="M0,196 C260,170 520,206 760,190 C1000,174 1220,204 1440,186 L1440,220 L0,220 Z" fill={to} />
    </svg>
  );
}

/** Miękka fala między sekcjami. */
export function Wave({ from, to, flip, className }: { from: string; to: string; flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={cn("pointer-events-none block h-10 w-full sm:h-16", flip && "rotate-180", className)} style={{ background: from }} aria-hidden>
      <path d="M0,40 C240,80 480,0 720,32 C960,64 1200,10 1440,40 L1440,80 L0,80 Z" fill={to} />
    </svg>
  );
}

/** Ozdobnik „✦ — ✦” pod nagłówkami. */
export function Ornament({ className, light }: { className?: string; light?: boolean }) {
  const c = light ? "#f6c76d" : "#e9ac3c";
  return (
    <svg viewBox="0 0 160 16" className={cn("mx-auto block h-4 w-40", className)} aria-hidden>
      <path d="M8 8 H64 M96 8 H152" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 5" />
      <path d="M80 1 L82.4 5.6 L87 8 L82.4 10.4 L80 15 L77.6 10.4 L73 8 L77.6 5.6 Z" fill={c} />
      <circle cx="68" cy="8" r="1.6" fill={c} />
      <circle cx="92" cy="8" r="1.6" fill={c} />
    </svg>
  );
}

/** Rozrzucone złote iskierki (dekoracja jasnych sekcji). */
export function Sparkles({ count = 8, seed = 11, className }: { count?: number; seed?: number; className?: string }) {
  const r = rng(seed);
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const size = 10 + r() * 14;
        return (
          <svg key={i} viewBox="0 0 20 20" className="star-twinkle absolute" style={{ left: `${r() * 96}%`, top: `${r() * 92}%`, width: size, height: size, animationDelay: `${r() * 3}s` }}>
            <path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z" fill="#f6c76d" opacity="0.8" />
          </svg>
        );
      })}
    </div>
  );
}

/** Ramka ilustracji jak w książce: złoty kontur, łuk u góry, delikatna poświata. */
export function StoryFrame({ src, alt, className, arch, children }: { src?: string | null; alt: string; className?: string; arch?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn("story-frame relative overflow-hidden", arch ? "rounded-t-[999px] rounded-b-[2rem]" : "rounded-[2rem]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        children
      )}
    </div>
  );
}
