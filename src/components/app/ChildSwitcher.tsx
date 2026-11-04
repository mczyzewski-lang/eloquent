"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Przełącznik aktywnego dziecka w górnym pasku aplikacji (bajki i powitania są dla wybranego dziecka). */
export function ChildSwitcher({ kids, activeId }: { kids: { id: string; name: string }[]; activeId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const active = kids.find((k) => k.id === activeId) ?? kids[0];
  if (!active) return null;

  async function choose(id: string) {
    if (id === active.id) return setOpen(false);
    setBusy(id);
    await fetch("/api/account/children", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "switch", childId: id }) });
    setBusy(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox" className="flex h-10 items-center gap-1.5 rounded-full bg-white pl-1 pr-3 text-sm font-bold text-navy shadow-sm" data-testid="child-switcher">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/40 font-display text-base">{active.name.slice(0, 1)}</span>
        {active.name}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Zamknij" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <ul role="listbox" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-white p-1 shadow-soft ring-1 ring-navy/10">
            {kids.map((k) => (
              <li key={k.id}>
                <button type="button" role="option" aria-selected={k.id === active.id} onClick={() => choose(k.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-semibold text-navy hover:bg-cream">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/30 text-sm">{k.name.slice(0, 1)}</span>
                  <span className="flex-1">{k.name}</span>
                  {busy === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : k.id === active.id && <Check className="h-4 w-4 text-sage-deep" />}
                </button>
              </li>
            ))}
            <li className="border-t border-navy/5">
              <Link href="/konto#dzieci" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gold-deep hover:bg-cream">
                <Plus className="h-4 w-4" /> Dodaj dziecko
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
