"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Tekst reklamy z przyciskiem „Kopiuj”. */
export function CopyBlock({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[inset_0_0_0_2px_rgb(59_42_31/0.14)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }} className="flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-bold text-navy">
          {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Skopiowano" : "Kopiuj"}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-navy">{text}</p>
    </div>
  );
}
