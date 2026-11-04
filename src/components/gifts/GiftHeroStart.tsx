"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GiftCreator } from "./GiftCreator";
import { getNameForms, validateName } from "@/lib/domain/names";

/** Zdarzenie otwierające okno kreatora z dowolnego przycisku na stronie. */
export const OPEN_GIFT_EVENT = "elofik:open-gift";

/**
 * Hero strony dla dziadków: od razu „Jak ma na imię Twój wnuk?” + „Stwórz bezpłatnie niespodziankę”.
 * Reszta kreatora otwiera się w oknie (na telefonie wysuwa się od dołu) z wpisanym już imieniem.
 */
export function GiftHeroStart() {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);

  useEffect(() => {
    window.addEventListener(OPEN_GIFT_EVENT, show);
    return () => window.removeEventListener(OPEN_GIFT_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const who = validateName(name).ok ? getNameForms(name.trim()).genitive : null;

  return (
    <>
      <form
        className="mx-auto mt-7 max-w-xl rounded-[var(--radius-2xl)] bg-white p-4 text-left shadow-[inset_0_0_0_2.5px_#3b2a1f,0_5px_0_rgb(20_26_50/0.35)] lg:mx-0"
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <label htmlFor="hero-child" className="block font-display text-lg font-semibold text-navy">Jak ma na imię Twój wnuk lub wnuczka?</label>
        <Input id="hero-child" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Leon" maxLength={30} autoComplete="off" />
        <Button type="submit" size="lg" className="mt-3 w-full" data-testid="gift-hero-start">
          <Gift className="h-5 w-5" /> Stwórz bezpłatnie niespodziankę
        </Button>
        <p className="mt-2 text-center text-xs text-muted">Bez konta i bez płatności. Gotowe w około minutę.</p>
      </form>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="gift-sheet-title">
          <button type="button" aria-label="Zamknij" className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
          <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-cream p-5 text-left pb-[max(1.25rem,env(safe-area-inset-bottom))] text-navy shadow-[inset_0_0_0_2.5px_#3b2a1f] sm:max-w-lg sm:rounded-[2rem] sm:p-6">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-navy/20 sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <h2 id="gift-sheet-title" className="text-2xl font-semibold">{who ? `Niespodzianka dla ${who}` : "Stwórz bezpłatną niespodziankę"}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zamknij" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_2px_#3b2a1f]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">Jeszcze kilka szczegółów i Elofik przygotuje Waszą wspólną bajkę.</p>
            <div className="mt-4">
              <GiftCreator initialChildName={name.trim()} inSheet />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Przycisk w dowolnym miejscu strony, który otwiera okno kreatora. */
export function OpenGiftButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_GIFT_EVENT))}>
      {children}
    </button>
  );
}
