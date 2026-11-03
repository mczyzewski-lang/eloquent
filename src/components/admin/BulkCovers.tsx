"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SceneSpec } from "@/lib/ai/elofik-bible";
import { illustrationsApi } from "./IllustrationCard";

interface Item {
  storyId: string;
  title: string;
  dayNumber: number;
  coverUrl: string | null;
  scene: SceneSpec;
}

/**
 * Generuje okładki do akceptacji dla bajek bez zatwierdzonej okładki — po kolei, po potwierdzeniu kosztu.
 * Wygenerowane okładki NIE są publikowane: trafiają do „Do akceptacji” w Admin → Ilustracje.
 */
export function BulkCovers({ items, costMedium, ready }: { items: Item[]; costMedium: number; ready: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const missing = items.filter((i) => !i.coverUrl);

  async function go() {
    if (!confirm(`Wygenerować ${missing.length} okładek (medium)? Szacunkowy koszt: ok. $${(missing.length * costMedium).toFixed(2)}. Okładki trafią do akceptacji.`)) return;
    setBusy(true);
    try {
      for (const [n, i] of missing.entries()) {
        setMsg(`Generuję ${n + 1}/${missing.length}: ${i.title}…`);
        await illustrationsApi({ action: "generate", storyId: i.storyId, imageType: "COVER", scene: i.scene, quality: "medium" });
      }
      setMsg("Gotowe — okładki czekają na akceptację w Admin → Ilustracje.");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">Okładki bajek</p>
          <p className="text-sm text-muted">Generowane z zatwierdzoną referencją Elofika i stałym opisem postaci; publikowane dopiero po akceptacji. Edycja sceny: w bajce → „Ilustracje”.</p>
        </div>
        <Button onClick={go} disabled={busy || !ready || missing.length === 0} data-testid="bulk-covers">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} {missing.length ? `Wygeneruj brakujące (${missing.length})` : "Wszystkie mają okładki"}
        </Button>
        <Link href="/admin/ilustracje" className="text-sm font-semibold underline">Do akceptacji →</Link>
      </div>
      {!ready && <p className="mt-2 text-sm text-muted">Wymaga klucza OpenAI, budżetu AI i zatwierdzonej referencji (Admin → Ilustracje).</p>}
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((i) => (
          <Link key={i.storyId} href={`/admin/bajki/${i.storyId}`} className="text-center text-xs">
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-navy/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.coverUrl ? <img src={i.coverUrl} alt={i.title} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted" />}
            </div>
            <p className="mt-1 font-semibold">Dzień {i.dayNumber}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
