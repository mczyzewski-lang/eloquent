"use client";

import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/admin-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error ?? "Błąd logowania");
      setBusy(false);
      return;
    }
    window.location.assign(j.redirect ?? "/admin");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="admin-email">E-mail</Label>
        <Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="admin-password">Hasło</Label>
        <Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="admin-login">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />} Zaloguj
      </Button>
    </form>
  );
}
