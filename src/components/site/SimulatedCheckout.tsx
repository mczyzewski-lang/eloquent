"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Ekran symulowanej płatności (tylko bez kluczy Stripe) — odpowiednik Stripe Checkout w trybie testowym. */
export function SimulatedCheckout({ kind, giftId }: { kind: "subscription" | "gift"; giftId: string | null }) {
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    const res = await fetch("/api/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(kind === "gift" ? { kind, giftId } : { kind }) });
    const j = await res.json();
    if (kind === "gift") window.location.href = `/dla-dziadkow/prezent-kupiony?demo=1&link=${encodeURIComponent(j.activationPath ?? "")}`;
    else window.location.href = "/app?subskrypcja=ok";
  }
  return (
    <main className="paper flex min-h-dvh items-center justify-center p-5">
      <Card className="w-full max-w-sm text-center">
        <CreditCard className="mx-auto h-8 w-8 text-navy" />
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gold-deep">Tryb demo — symulacja Stripe Checkout</p>
        <h1 className="mt-2 text-2xl font-semibold">{kind === "gift" ? "Prezent: 1 miesiąc Elofika" : "Elofik Premium"}</h1>
        <p className="mt-1 text-muted">{kind === "gift" ? "39,90 zł jednorazowo, bez odnowienia" : "39,90 zł / miesiąc"}</p>
        <Button size="lg" className="mt-6 w-full" onClick={pay} disabled={busy} data-testid="simulate-pay">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Zapłać (symulacja)
        </Button>
        <a href={kind === "gift" ? "/dla-dziadkow" : "/subskrypcja?anulowano=1"} className="mt-3 block text-sm text-muted">Anuluj</a>
      </Card>
    </main>
  );
}
