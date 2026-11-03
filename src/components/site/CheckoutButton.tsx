"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { track } from "@/lib/client/analytics";

export function CheckoutButton({ children, ...props }: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    track("checkout_started", { kind: "subscription" });
    const res = await fetch("/api/checkout", { method: "POST" });
    const j = await res.json();
    if (res.status === 401) return (window.location.href = "/onboarding");
    if (res.status === 409) return (window.location.href = j.portal ?? "/konto");
    if (!res.ok) {
      setErr(j.error);
      setBusy(false);
      return;
    }
    window.location.href = j.url;
  }
  return (
    <>
      <Button onClick={go} disabled={busy} {...props}>
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {children}
      </Button>
      {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
    </>
  );
}
