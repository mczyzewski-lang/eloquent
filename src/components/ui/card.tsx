import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-ui="card" className={cn("card-soft p-6", className)} {...props} />;
}

export function Badge({ className, tone = "gold", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "gold" | "sage" | "navy" | "peach" | "muted" }) {
  const tones = {
    gold: "bg-gold/25 text-navy",
    sage: "bg-sage/25 text-sage-deep",
    navy: "bg-navy text-cream",
    peach: "bg-peach text-navy",
    muted: "bg-navy/5 text-muted",
  };
  return <span data-ui="badge" data-tone={tone} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", tones[tone], className)} {...props} />;
}

export function SectionTitle({ eyebrow, title, subtitle, className }: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}
