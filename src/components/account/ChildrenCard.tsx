"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { validateName } from "@/lib/domain/names";
import { cn } from "@/lib/utils";

type Kid = { id: string; name: string; age: number };

async function call(body: unknown) {
  const res = await fetch("/api/account/children", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Nie udało się zapisać");
  return j;
}

/** Dzieci w rodzinie: lista, przełączanie, dodawanie kolejnego dziecka. */
export function ChildrenCard({ kids, activeId, max }: { kids: Kid[]; activeId: string | null; max: number }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(5);
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <Card id="dzieci">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Baby className="h-5 w-5 text-gold-deep" /> Dzieci</h2>
      <p className="mt-1 text-sm text-muted">Bajki, powitania Elofika i imiona w historiach są dla wybranego dziecka. Przełączasz je też w górnym pasku aplikacji.</p>
      <ul className="mt-4 space-y-2">
        {kids.map((k) => {
          const on = k.id === activeId;
          return (
            <li key={k.id} className={cn("flex items-center gap-3 rounded-2xl border-2 px-3 py-2", on ? "border-gold-deep/60 bg-gold/10" : "border-navy/10")}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/30 font-display text-lg font-semibold text-navy">{k.name.slice(0, 1)}</span>
              <span className="flex-1 font-semibold text-navy">{k.name} <span className="text-sm font-normal text-muted">· {k.age} lat{k.age === 4 ? "a" : ""}</span></span>
              {on ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-sage-deep"><Check className="h-4 w-4" /> wybrane</span>
              ) : (
                <>
                  <Button size="sm" variant="soft" disabled={!!busy} onClick={() => run(`s-${k.id}`, () => call({ action: "switch", childId: k.id }))}>{busy === `s-${k.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Wybierz</Button>
                  <button type="button" aria-label={`Usuń profil: ${k.name}`} disabled={!!busy} onClick={() => { if (confirm(`Usunąć profil ${k.name}? Bajki i postęp rodziny zostają.`)) void run(`r-${k.id}`, () => call({ action: "remove", childId: k.id })); }} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-navy/5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {kids.length < max && !adding && (
        <Button variant="soft" className="mt-4" onClick={() => setAdding(true)} data-testid="add-child"><Plus className="h-5 w-5" /> Dodaj kolejne dziecko</Button>
      )}
      {adding && (
        <form
          className="mt-4 space-y-4 rounded-2xl bg-cream p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validateName(name).ok) return setMsg("Podaj poprawne imię dziecka.");
            void run("add", async () => {
              await call({ action: "add", child: { name: name.trim(), age, gender, addressStyle: "diminutive" } });
              setAdding(false);
              setName("");
            });
          }}
        >
          <div>
            <Label htmlFor="kid-name">Imię dziecka</Label>
            <Input id="kid-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="np. Kasia" />
          </div>
          <div>
            <Label>Wiek</Label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 5, 6, 7].map((a) => (
                <button key={a} type="button" aria-pressed={age === a} onClick={() => setAge(a)} className={cn("h-12 rounded-2xl border-2 font-semibold", age === a ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Jak mówić o dziecku w bajkach?</Label>
            <div className="grid grid-cols-3 gap-2">
              {([["m", "On"], ["f", "Ona"], [null, "Neutralnie"]] as const).map(([g, l]) => (
                <button key={l} type="button" aria-pressed={gender === g} onClick={() => setGender(g)} className={cn("h-12 rounded-2xl border-2 font-semibold", gender === g ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!!busy} data-testid="add-child-submit">{busy === "add" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Dodaj dziecko</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Anuluj</Button>
          </div>
          <p className="text-xs text-muted">Rodzina (mama, tata, dziadkowie, zwierzaki) jest wspólna dla wszystkich dzieci. Zwrot do dziecka i zdrobnienie zmienisz w profilu po wybraniu dziecka.</p>
        </form>
      )}
      {msg && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{msg}</p>}
    </Card>
  );
}
