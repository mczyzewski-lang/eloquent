"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthForm, type AuthConfig } from "@/components/onboarding/AuthForm";

/** Aktywacja prezentu: wymaga konta rodzica (magic link). Po aktywacji — prosto do aplikacji. */
export function RedeemGift({ token, loggedIn, auth, ctaLabel }: { token: string; loggedIn: boolean; auth: AuthConfig; ctaLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);

  async function redeem() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/gift/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await res.json();
    if (res.status === 401) {
      setNeedAuth(true);
      setBusy(false);
      return;
    }
    if (!res.ok) {
      setErr(j.error);
      setBusy(false);
      return;
    }
    window.location.href = "/app?witaj=1";
  }

  if (needAuth || !loggedIn) {
    return (
      <div className="card-soft p-6 text-left">
        <p className="mb-4 font-display text-lg font-semibold text-navy">Załóż konto rodzica, aby aktywować prezent</p>
        <AuthForm auth={auth} next={`/aktywuj-prezent/${token}`} onDemoSignedIn={redeem} cta="Wyślij link i aktywuj" />
        {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      </div>
    );
  }
  return (
    <>
      <Button size="xl" className="w-full whitespace-normal" onClick={redeem} disabled={busy} data-testid="redeem">
        {busy && <Loader2 className="h-5 w-5 animate-spin" />} {ctaLabel}
      </Button>
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
    </>
  );
}
