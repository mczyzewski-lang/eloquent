"use client";

/**
 * Elofik — mały elf opowieści. Wygląd kanoniczny: grafiki dostarczone przez właściciela marki
 * (public/brand/elofik/*.webp — wycięte z tła). Ilustracje scen z OpenAI powstają z tego samego wzoru.
 */
import { createContext } from "react";
import { cn } from "@/lib/utils";
import { ELOFIK_POSES, type ElofikMood } from "./poses";

/** Zostawione dla zgodności (dawniej: pozy z OpenAI). Elofik zawsze używa grafik marki. */
const MascotContext = createContext<Record<string, string>>({});

export function MascotProvider({ map, children }: { map: Record<string, string>; children: React.ReactNode }) {
  return <MascotContext.Provider value={map}>{children}</MascotContext.Provider>;
}

export { ELOFIK_POSES, type ElofikMood } from "./poses";

/**
 * `fallback` — zostawione dla zgodności z miejscami, które wcześniej ukrywały zastępczego Elofika.
 * Teraz Elofik ma własne pozy, więc pokazujemy go zawsze.
 */
export function Elofik({ mood = "idle", className, title = "Elofik, mały elf opowieści" }: { mood?: ElofikMood; className?: string; title?: string; fallback?: React.ReactNode }) {
  return (
    <span className={cn("relative block", className)}>
      {/* miękki cień pod stopami (grafiki są wycięte z tła) */}
      <span aria-hidden className="absolute inset-x-[18%] bottom-[0.5%] h-[3.5%] rounded-[50%] bg-navy/15 blur-[3px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ELOFIK_POSES[mood]} alt={title} draggable={false} className={cn("mascot-img relative block h-auto w-full select-none object-contain", `mascot-${mood}`)} />
    </span>
  );
}

export function Sparkles({ className, count = 7 }: { className?: string; count?: number }) {
  const pts = [
    [8, 20], [88, 12], [18, 72], [92, 64], [50, 4], [70, 88], [30, 40], [96, 36], [4, 50],
  ].slice(0, count);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {pts.map(([x, y], i) => (
        <svg key={i} viewBox="0 0 20 20" className="absolute h-4 w-4 animate-twinkle text-gold" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.35}s` }}>
          <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

