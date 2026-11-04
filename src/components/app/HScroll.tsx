"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Poziomy, przewijany palcem pas (scroll-snap). Po wejściu centruje element z data-focus (np. dzisiejszą bajkę) — bez przewijania strony w pionie. */
export function HScroll({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const target = el?.querySelector<HTMLElement>("[data-focus]");
    if (!el || !target) return;
    el.scrollLeft = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2;
  }, []);
  return (
    <div ref={ref} role="list" aria-label={label} className={cn("-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {children}
    </div>
  );
}
