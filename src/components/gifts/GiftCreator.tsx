"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { validateName } from "@/lib/domain/names";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";

const INTERESTS = ["Zwierzęta", "Kosmos", "Dinozaury", "Przyroda", "Pojazdy", "Magia", "Roboty", "Przygody"];

/** Kreator bezpłatnej bajki-niespodzianki od babci/dziadka. */
export function GiftCreator() {
  const router = useRouter();
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState(5);
  const [relation, setRelation] = useState<"grandma" | "grandpa">("grandma");
  const [giverName, setGiverName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateName(childName).ok || !validateName(giverName).ok) {
      setErr("Sprawdź imiona — mogą zawierać tylko litery.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/gift/free", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childName, childAge: age, giverRelation: relation, giverName, interests: interests.map((i) => i.toLowerCase()) }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error);
      setBusy(false);
      return;
    }
    track("gift_free_created", { relation });
    router.push(`${j.path}?nowa=1`);
  }

  return (
    <form onSubmit={submit} className="card-soft space-y-5 p-6" id="kreator">
      <h2 className="text-2xl font-semibold">Stwórz bezpłatną niespodziankę</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="g-child">Imię wnuka lub wnuczki</Label>
          <Input id="g-child" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="np. Leon" maxLength={30} required />
        </div>
        <div>
          <Label>Wiek dziecka</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {[3, 4, 5, 6, 7].map((a) => (
              <button key={a} type="button" onClick={() => setAge(a)} aria-pressed={age === a} className={cn("h-14 rounded-2xl border-2 font-display text-lg font-semibold", age === a ? "border-gold-deep bg-gold/25" : "border-navy/10 bg-white text-muted")}>{a}</button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label>Kto daje prezent?</Label>
        <div className="grid grid-cols-2 gap-2">
          {([["grandma", "Babcia"], ["grandpa", "Dziadek"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setRelation(v)} aria-pressed={relation === v} className={cn("h-14 rounded-2xl border-2 font-display text-lg font-semibold", relation === v ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="g-giver">{relation === "grandma" ? "Imię babci" : "Imię dziadka"}</Label>
        <Input id="g-giver" value={giverName} onChange={(e) => setGiverName(e.target.value)} placeholder={relation === "grandma" ? "np. Basia" : "np. Jan"} maxLength={30} required />
        <p className="mt-1 text-xs text-muted">W bajce usłyszycie np. „{relation === "grandma" ? "babcia" : "dziadek"} {giverName || (relation === "grandma" ? "Basia" : "Jan")}”.</p>
      </div>
      <div>
        <Label>Co lubi wnuk? (opcjonalnie)</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i);
            return (
              <button key={i} type="button" onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])} aria-pressed={on} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold", on ? "border-gold-deep bg-gold/20" : "border-navy/10 bg-white text-muted")}>{i}</button>
            );
          })}
        </div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <Button type="submit" size="xl" className="w-full" disabled={busy} data-testid="gift-generate">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} Wygeneruj naszą bajkę
      </Button>
      <p className="text-center text-xs text-muted">Bezpłatnie, bez zakładania konta. Link będzie ważny 30 dni.</p>
    </form>
  );
}
