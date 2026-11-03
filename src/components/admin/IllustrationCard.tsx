"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { ACCEPTANCE_CHECKLIST } from "@/lib/ai/elofik-bible";

export interface IllustrationView {
  id: string;
  storyId: string;
  imageType: "COVER" | "INTERIOR" | "CHARACTER_ONLY";
  slot: string | null;
  version: number;
  status: "pending" | "approved" | "rejected" | "failed";
  scene: Record<string, string>;
  model: string;
  size: string;
  quality: string;
  promptVersion: string;
  referenceVersion: number;
  estUsd: number;
  createdAt: string;
  reviewedBy: string | null;
  url: string | null;
}

export async function illustrationsApi<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/admin/illustrations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Błąd ${res.status}`);
  return j as T;
}

const STATUS = {
  pending: { label: "do akceptacji", tone: "gold" },
  approved: { label: "zatwierdzona", tone: "sage" },
  rejected: { label: "odrzucona", tone: "muted" },
  failed: { label: "błąd", tone: "muted" },
} as const;

/** Podgląd obok referencji + checklista akceptacji (wszystkie punkty wymagane do zatwierdzenia). */
export function IllustrationCard({ item, referenceUrl, onChange, onRegenerate }: { item: IllustrationView; referenceUrl: string | null; onChange: (i: IllustrationView) => void; onRegenerate?: () => Promise<void> }) {
  const [checks, setChecks] = useState<boolean[]>(ACCEPTANCE_CHECKLIST.map(() => false));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const relevant = ACCEPTANCE_CHECKLIST.map((c, i) => ({ c, i })).filter(({ c }) => item.imageType === "COVER" || !c.includes("okładka"));
  const allChecked = relevant.every(({ i }) => checks[i]);

  async function review(decision: "approved" | "rejected") {
    setBusy(decision);
    setErr(null);
    try {
      onChange((await illustrationsApi<{ illustration: IllustrationView }>({ action: "review", id: item.id, decision })).illustration);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-navy">{item.imageType}{item.slot ? ` · ${item.slot}` : ""} · v{item.version}</p>
        <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
        <span className="text-xs text-muted">{item.model} · {item.size} · {item.quality} · prompt {item.promptVersion} · referencja v{item.referenceVersion} · ~${item.estUsd.toFixed(2)}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f3efe8_0%_25%,#fff_0%_50%)] bg-[length:20px_20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.url ? <img src={item.url} alt={`Ilustracja ${item.imageType}`} className="max-h-96 w-auto" /> : <p className="p-6 text-sm text-muted">Brak obrazu</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-muted">Referencja</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {referenceUrl && <img src={referenceUrl} alt="Referencja Elofika" className="mt-1 w-full rounded-xl border border-navy/10" />}
        </div>
      </div>
      {item.status === "pending" && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-navy">Checklista akceptacji</p>
          <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
            {relevant.map(({ c, i }) => (
              <li key={c}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((x) => x.map((v, j) => (j === i ? e.target.checked : v)))} className="mt-1" />
                  {c}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.status !== "approved" && (
          <Button size="sm" variant="sage" disabled={!!busy || (item.status === "pending" && !allChecked)} onClick={() => review("approved")} title={allChecked ? "" : "Zaznacz wszystkie punkty checklisty"}>
            {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Zatwierdź
          </Button>
        )}
        {item.status !== "rejected" && (
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => review("rejected")}>
            {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Odrzuć
          </Button>
        )}
        {onRegenerate && (
          <Button size="sm" variant="soft" disabled={!!busy} onClick={async () => { setBusy("regen"); setErr(null); try { await onRegenerate(); } catch (e) { setErr((e as Error).message); } setBusy(null); }}>
            {busy === "regen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Wygeneruj nową wersję
          </Button>
        )}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
    </div>
  );
}
