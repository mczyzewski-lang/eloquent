"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const IDEAS = [
  "Pierwsza wizyta u dentysty — że nie ma się czego bać",
  "Wyprawa na Księżyc w kartonowej rakiecie",
  "Nasz pies szuka zgubionej piłki w parku",
  "Dzień, w którym w domu pojawia się młodsze rodzeństwo",
  "Podróż nad morze i budowanie zamku z piasku",
];

export function CustomStoryForm({ relations, quota, childName }: { relations: { relation: string; label: string }[]; quota: { used: number; limit: number; left: number }; childName: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [word, setWord] = useState("");
  const [length, setLength] = useState<"short" | "long">("short");
  const [picked, setPicked] = useState<string[]>(relations.map((r) => r.relation));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/custom-stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", request: { idea, word: word || null, length, relations: picked } }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Nie udało się stworzyć bajki.");
      router.push(`/app/bajka/${j.storyId}?bez_powitania=1`);
    } catch (err) {
      setMsg((err as Error).message);
      setBusy(false);
    }
  }

  if (quota.left <= 0) {
    return <p className="rounded-2xl bg-peach p-4 text-navy">W tym miesiącu wykorzystaliście już {quota.limit} własne bajki. Nowe będą dostępne od 1. dnia przyszłego miesiąca.</p>;
  }

  return (
    <form onSubmit={submit} className="card-soft space-y-5 p-5">
      <div>
        <Label htmlFor="idea">O czym ma być bajka?</Label>
        <textarea id="idea" required minLength={10} maxLength={400} rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={`np. ${IDEAS[0]}`} className="w-full rounded-2xl border-2 border-navy/10 bg-white p-4 text-base text-navy focus:border-gold-deep focus:outline-none focus:ring-4 focus:ring-gold/30" />
        <div className="mt-2 flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setIdea(i)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm">{i}</button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="word">Mądre słowo (opcjonalnie)</Label>
        <Input id="word" maxLength={40} value={word} onChange={(e) => setWord(e.target.value)} placeholder="np. odwaga, cierpliwość — albo zostaw puste" />
      </div>
      {relations.length > 0 && (
        <div>
          <Label>Kto jeszcze wystąpi?</Label>
          <div className="flex flex-wrap gap-2">
            {relations.map((r) => {
              const on = picked.includes(r.relation);
              return (
                <button key={r.relation} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== r.relation) : [...p, r.relation]))} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold", on ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <Label>Długość</Label>
        <div className="grid grid-cols-2 gap-2">
          {([["short", "Krótka · ok. 3 min"], ["long", "Dłuższa · ok. 6 min"]] as const).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={length === v} onClick={() => setLength(v)} className={cn("h-12 rounded-2xl border-2 font-semibold", length === v ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>{l}</button>
          ))}
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-sage/15 p-3 text-xs text-navy">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-sage-deep" />
        Imiona ({childName || "dziecka"} i bliskich) nie trafiają do AI — Elofik wstawia je dopiero przy nagraniu. Każdy pomysł sprawdzamy pod kątem bezpieczeństwa dla małych dzieci.
      </p>
      {msg && <p role="alert" className="text-sm font-semibold text-red-600">{msg}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || idea.trim().length < 10} data-testid="custom-story-submit">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} {busy ? "Elofik pisze bajkę…" : "Stwórz bajkę"}
      </Button>
      <p className="text-center text-xs text-muted">W tym miesiącu: {quota.used} z {quota.limit} własnych bajek</p>
    </form>
  );
}
