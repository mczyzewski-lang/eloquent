"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoLauncher() {
  const [busy, setBusy] = useState<string | null>(null);
  async function go(kind: "family" | "fresh" | "admin") {
    setBusy(kind);
    const res = await fetch("/api/demo/seed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
    const j = await res.json();
    window.location.href = j.redirect ?? "/app";
  }
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <Button onClick={() => go("family")} disabled={!!busy} data-testid="demo-family">{busy === "family" && <Loader2 className="h-4 w-4 animate-spin" />} Wejdź jako rodzina Leona</Button>
      <Button variant="soft" onClick={() => go("fresh")} disabled={!!busy}>Nowa rodzina (Dzień 1)</Button>
      <Button variant="navy" onClick={() => go("admin")} disabled={!!busy}>Wejdź jako admin</Button>
    </div>
  );
}
