"use client";

/**
 * Elofik — mały elf opowieści.
 * Jeśli w panelu (Admin → Ilustracje → Elofik na stronie) zatwierdzono pozy maskotki wygenerowane
 * z character bible (OpenAI + referencja), komponent pokazuje je w całym serwisie.
 * Do tego czasu pokazuje Elofika z logo marki (public/brand/elofik-mark.png).
 */
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

/** mood → URL zatwierdzonej ilustracji (dostarczane przez <MascotProvider> w layoucie). */
const MascotContext = createContext<Record<string, string>>({});

export function MascotProvider({ map, children }: { map: Record<string, string>; children: React.ReactNode }) {
  return <MascotContext.Provider value={map}>{children}</MascotContext.Provider>;
}

export type ElofikMood = "idle" | "listening" | "happy" | "waving" | "telling" | "sleepy";

export function Elofik({ mood = "idle", className, title = "Elofik, mały elf opowieści" }: { mood?: ElofikMood; className?: string; title?: string }) {
  const mascots = useContext(MascotContext);
  const src = mascots[mood] ?? mascots.idle;
  if (src) {
    // zatwierdzona ilustracja z panelu; animacje nastroju realizowane na całej postaci
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} draggable={false} className={cn("mascot-img block h-auto w-full select-none object-contain", `mascot-${mood}`, className)} />;
  }
  return <ElofikBrand mood={mood} className={className} title={title} />;
}

/** Elofik z logo marki (ilustracja zatwierdzona przez właściciela) — do czasu akceptacji póz z OpenAI. */
const BRAND_ELOFIK = "/brand/elofik-mark.png";

function ElofikBrand({ mood, className, title }: { mood: ElofikMood; className?: string; title: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND_ELOFIK} alt={title} draggable={false} className={cn("mascot-img block h-auto w-full select-none object-contain", `mascot-${mood}`, className)} />;
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

