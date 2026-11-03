"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { validateName } from "@/lib/domain/names";
import type { RelationType } from "@/lib/domain/templates";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";

const RELS: [RelationType, string][] = [["mom", "Mama"], ["dad", "Tata"], ["grandma", "Babcia"], ["grandpa", "Dziadek"], ["brother", "Brat"], ["sister", "Siostra"], ["dog", "Pies"], ["cat", "Kot"]];

/** Onboarding prezentowy: dane wnuka i darczyńcy, e-mail kupującego, opcjonalnie e-mail rodzica. */
export function GiftPurchaseForm() {
  const [f, setF] = useState({ childName: "", childAge: 5, giverName: "", giverRelation: "grandma" as "grandma" | "grandpa" | "other", buyerEmail: "", parentEmail: "" });
  const [members, setMembers] = useState<{ relation: RelationType; name: string }[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateName(f.childName).ok || !validateName(f.giverName).ok) return setErr("Sprawdź imiona.");
    setBusy(true);
    setErr(null);
    track("gift_purchase_started", { relation: f.giverRelation });
    const res = await fetch("/api/gift/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, parentEmail: f.parentEmail || null, members: members.filter((m) => m.name.trim()), interests }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error);
      setBusy(false);
      return;
    }
    window.location.href = j.url;
  }

  return (
    <form onSubmit={submit} className="card-soft space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-child">Imię wnuka</Label>
          <Input id="p-child" required maxLength={30} value={f.childName} onChange={(e) => setF({ ...f, childName: e.target.value })} placeholder="np. Leon" />
        </div>
        <div>
          <Label>Wiek</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {[4, 5, 6, 7].map((a) => (
              <button key={a} type="button" aria-pressed={f.childAge === a} onClick={() => setF({ ...f, childAge: a })} className={cn("h-14 rounded-2xl border-2 font-display text-lg font-semibold", f.childAge === a ? "border-gold-deep bg-gold/25" : "border-navy/10 bg-white text-muted")}>{a}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Relacja</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {([["grandma", "Babcia"], ["grandpa", "Dziadek"], ["other", "Inna"]] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={f.giverRelation === v} onClick={() => setF({ ...f, giverRelation: v })} className={cn("h-14 rounded-2xl border-2 font-semibold", f.giverRelation === v ? "border-gold-deep bg-gold/25" : "border-navy/10 bg-white text-muted")}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="p-giver">Twoje imię (darczyńcy)</Label>
          <Input id="p-giver" required maxLength={30} value={f.giverName} onChange={(e) => setF({ ...f, giverName: e.target.value })} placeholder="np. Basia" />
        </div>
      </div>
      <div>
        <Label>Inni członkowie rodziny (opcjonalnie)</Label>
        <div className="flex flex-wrap gap-2">
          {RELS.map(([r, l]) => (
            <button key={r} type="button" onClick={() => setMembers([...members, { relation: r, name: "" }])} className="inline-flex items-center gap-1 rounded-full border-2 border-navy/10 bg-white px-3 py-1.5 text-sm font-semibold text-navy"><Plus className="h-4 w-4" />{l}</button>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {members.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-20 text-sm font-semibold text-muted">{RELS.find((x) => x[0] === m.relation)?.[1]}</span>
              <Input className="h-12" value={m.name} maxLength={30} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Imię" />
              <button type="button" aria-label="Usuń" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="p-2 text-muted"><X className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Label>Zainteresowania (opcjonalnie)</Label>
        <div className="flex flex-wrap gap-2">
          {["zwierzeta", "kosmos", "dinozaury", "przyroda", "pojazdy", "magia", "roboty", "przygody"].map((i) => {
            const on = interests.includes(i);
            return <button key={i} type="button" aria-pressed={on} onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold capitalize", on ? "border-gold-deep bg-gold/20" : "border-navy/10 bg-white text-muted")}>{i === "zwierzeta" ? "zwierzęta" : i}</button>;
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-buyer">Twój e-mail (potwierdzenie zakupu)</Label>
          <Input id="p-buyer" type="email" required value={f.buyerEmail} onChange={(e) => setF({ ...f, buyerEmail: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="p-parent">E-mail rodzica (opcjonalnie)</Label>
          <Input id="p-parent" type="email" value={f.parentEmail} onChange={(e) => setF({ ...f, parentEmail: e.target.value })} placeholder="wyślemy zaproszenie" />
        </div>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <Button type="submit" size="xl" className="w-full" disabled={busy} data-testid="gift-buy">
        {busy && <Loader2 className="h-5 w-5 animate-spin" />} Kupuję prezent — 39,90 zł
      </Button>
      <p className="text-center text-xs text-muted">1 miesiąc dostępu, płatność jednorazowa, bez automatycznego odnowienia. Rodzic aktywuje prezent w dogodnym momencie (link ważny 12 miesięcy).</p>
    </form>
  );
}
