import Link from "next/link";
import { BookHeart, Library, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChildSwitcher } from "./ChildSwitcher";

export type AppTab = "dzisiaj" | "bajki" | "slowa" | "postep" | "konto";

const NAV: { id: AppTab; href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dzisiaj", href: "/app", label: "Dzisiaj", icon: Sparkles },
  { id: "bajki", href: "/app?tab=bajki", label: "Bajki", icon: Library },
  { id: "slowa", href: "/app?tab=slowa", label: "Słowa", icon: BookHeart },
  { id: "postep", href: "/app?tab=postep", label: "Postęp", icon: TrendingUp },
  { id: "konto", href: "/konto", label: "Rodzic", icon: UserRound },
];

/**
 * Układ aplikacji jak w aplikacji mobilnej: górny pasek, przewijana treść, dolny pasek zakładek
 * (z uwzględnieniem wcięć ekranu iPhone'a — safe-area).
 */
export function AppShell({ active, title, kids, activeChildId, children }: { active: AppTab; title?: React.ReactNode; kids?: { id: string; name: string }[]; activeChildId?: string | null; children: React.ReactNode }) {
  return (
    <div className="paper min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-navy/5 bg-cream/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/app" aria-label="Elofik — dzisiaj" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/elofik-head.webp" alt="" className="h-10 w-10 object-contain" />
          </Link>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-navy">{title}</p>
          {kids?.length ? (
            <ChildSwitcher kids={kids} activeId={activeChildId ?? null} />
          ) : (
            <Link href="/konto" aria-label="Panel rodzica" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm">
              <UserRound className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4">{children}</main>

      <nav aria-label="Nawigacja aplikacji" className="fixed inset-x-0 bottom-0 z-50 border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <li key={n.id}>
                <Link href={n.href} aria-current={on ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition", on ? "text-navy" : "text-muted")}>
                  <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition", on && "bg-gold/35")}>
                    <n.icon className="h-5 w-5" />
                  </span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
