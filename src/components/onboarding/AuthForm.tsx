"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { browserSupabase } from "@/lib/client/supabase";

export interface AuthConfig {
  demo: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Logowanie dorosłego opiekuna: magic link (preferowany), Google, Apple.
 * Tryb demo: natychmiastowe logowanie bez wysyłki e-maila.
 */
export function AuthForm({ auth, next, onDemoSignedIn, cta = "Wyślij link do logowania" }: { auth: AuthConfig; next: string; onDemoSignedIn?: () => Promise<void> | void; cta?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setMsg("Potwierdź, że jesteś pełnoletnim opiekunem i akceptujesz regulamin.");
      return;
    }
    setState("sending");
    setMsg(null);
    try {
      if (auth.demo) {
        const res = await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
        if (!res.ok) throw new Error((await res.json()).error ?? "Błąd logowania");
        await onDemoSignedIn?.();
        if (!onDemoSignedIn) window.location.href = next;
        return;
      }
      const sb = browserSupabase(auth.supabaseUrl, auth.supabaseAnonKey);
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!consent) {
      setMsg("Potwierdź, że jesteś pełnoletnim opiekunem i akceptujesz regulamin.");
      return;
    }
    const sb = browserSupabase(auth.supabaseUrl, auth.supabaseAnonKey);
    await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }

  if (state === "sent") {
    return (
      <div className="rounded-3xl bg-sage/15 p-6 text-center">
        <Mail className="mx-auto h-8 w-8 text-sage-deep" />
        <p className="mt-3 font-display text-xl font-semibold text-navy">Sprawdź skrzynkę!</p>
        <p className="mt-2 text-muted">Wysłaliśmy link na <strong>{email}</strong>. Kliknij go na tym urządzeniu, a przeniesiemy Cię dalej.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email">Twój e-mail (rodzica lub opiekuna)</Label>
        <Input id="email" type="email" required autoComplete="email" inputMode="email" placeholder="np. monika@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#E9AC3C]" />
        <span>
          Jestem pełnoletnim rodzicem lub opiekunem dziecka i akceptuję <a href="/regulamin" className="underline" target="_blank">regulamin</a> oraz <a href="/polityka-prywatnosci" className="underline" target="_blank">politykę prywatności</a>.
        </span>
      </label>
      {msg && <p role="alert" className="text-sm font-semibold text-red-600">{msg}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"} data-testid="auth-submit">
        {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
        {auth.demo ? "Utwórz konto (demo)" : cta}
      </Button>
      {!auth.demo && (
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="soft" onClick={() => oauth("google")}>Google</Button>
          <Button type="button" variant="soft" onClick={() => oauth("apple")}>Apple</Button>
        </div>
      )}
      {auth.demo && <p className="text-center text-xs text-muted">Tryb demo: konto tworzone natychmiast, bez wysyłki e-maila.</p>}
    </form>
  );
}
