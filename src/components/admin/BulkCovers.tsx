"use client";

import { useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Item {
  storyId: string;
  title: string;
  dayNumber: number;
  coverUrl: string | null;
}

type Status = "idle" | "running" | "done" | "error";

/**
 * Generuje okładki po kolei (jedna na zapytanie) — bez zależności od workera i limitów czasu zapytań.
 * Każda okładka powstaje z arkuszem referencyjnym Elofika, więc postać jest spójna na wszystkich.
 */
export function BulkCovers({ items, estimateUsd }: { items: Item[]; estimateUsd: number }) {
  const [state, setState] = useState<Record<string, { status: Status; url: string | null; msg?: string }>>(
    Object.fromEntries(items.map((i) => [i.storyId, { status: i.coverUrl ? "done" : "idle", url: i.coverUrl }])),
  );
  const [running, setRunning] = useState(false);
  const missing = items.filter((i) => !state[i.storyId]?.url);

  async function generate(list: Item[], force: boolean) {
    setRunning(true);
    for (const item of list) {
      setState((s) => ({ ...s, [item.storyId]: { ...s[item.storyId], status: "running" } }));
      try {
        const res = await fetch("/api/admin/stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "illustration", storyId: item.storyId, force }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Błąd");
        setState((s) => ({ ...s, [item.storyId]: { status: "done", url: j.coverUrl } }));
      } catch (e) {
        setState((s) => ({ ...s, [item.storyId]: { ...s[item.storyId], status: "error", msg: (e as Error).message } }));
        // brak klucza / budżetu dotyczy wszystkich — przerywamy zamiast powtarzać błąd
        if (/klucza|budżetu/i.test((e as Error).message)) break;
      }
    }
    setRunning(false);
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">Okładki bajek (OpenAI)</p>
          <p className="text-sm text-muted">
            Każda okładka jest rysowana z arkuszem referencyjnym Elofika, żeby postać była zawsze ta sama. Szacunkowo ok. ${estimateUsd.toFixed(2)} za okładkę; wymaga klucza OpenAI i budżetu AI w Ustawieniach.
          </p>
        </div>
        <Button onClick={() => generate(missing, false)} disabled={running || missing.length === 0} data-testid="bulk-covers">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {missing.length ? `Wygeneruj brakujące (${missing.length})` : "Wszystkie okładki gotowe"}
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((i) => {
          const st = state[i.storyId];
          return (
            <div key={i.storyId} className="text-center text-xs">
              <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl bg-navy/5">
                {st?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={st.url} alt={i.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted" />
                )}
                {st?.status === "running" && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-6 w-6 animate-spin text-gold-deep" /></span>}
              </div>
              <p className="mt-1 font-semibold">Dzień {i.dayNumber}</p>
              {st?.status === "done" && <CheckCircle2 className="mx-auto h-4 w-4 text-sage-deep" />}
              {st?.status === "error" && <p className="flex items-start justify-center gap-1 text-red-700"><XCircle className="h-4 w-4 flex-none" />{st.msg}</p>}
              {st?.url && !running && (
                <button type="button" className="text-muted underline" onClick={() => generate([i], true)}>ponownie</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
