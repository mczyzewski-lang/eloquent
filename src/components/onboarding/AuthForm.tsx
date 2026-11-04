"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { browserSupabase } from "@/lib/client/supabase";
import { formatPhone, normalizePhone } from "@/lib/domain/phone";

export interface AuthConfig {
  demo: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const CONSENT_MSG = "Potwierdź, że jesteś pełnoletnim opiekunem i akceptujesz regulamin.";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Coś poszło nie tak. Spróbuj ponownie.");
  return j as T;
}

/**
 * Konto rodzica: numer telefonu + jednorazowy kod SMS (domyślnie), e-mail jako alternatywa.
 * Bez Supabase: własne kody (/api/auth/phone/*); z Supabase: Supabase Auth (phone OTP / magic link).
 */
export function AuthForm({ auth, next, onDemoSignedIn, cta }: { auth: AuthConfig; next: string; onDemoSignedIn?: () => Promise<void> | void; cta?: string }) {
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const afterSignIn = async () => {
    if (onDemoSignedIn) await onDemoSignedIn();
    else window.location.assign(next);
  };

  const consentBox = (
    <label className="flex items-start gap-3 text-sm text-muted">
      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 flex-none accent-[#E9AC3C]" />
      <span>
        Jestem pełnoletnim rodzicem lub opiekunem dziecka i akceptuję <a href="/regulamin" className="underline" target="_blank">regulamin</a> oraz <a href="/polityka-prywatnosci" className="underline" target="_blank">politykę prywatności</a>.
      </span>
    </label>
  );

  return (
    <div className="space-y-4">
      {method === "phone" ? (
        <PhoneForm auth={auth} consent={consent} consentBox={consentBox} onSignedIn={afterSignIn} setMsg={setMsg} />
      ) : (
        <EmailForm auth={auth} next={next} consent={consent} consentBox={consentBox} onSignedIn={afterSignIn} setMsg={setMsg} cta={cta} />
      )}
      {msg && <p role="alert" className="text-sm font-semibold text-red-600">{msg}</p>}
      <button type="button" onClick={() => { setMsg(null); setMethod(method === "phone" ? "email" : "phone"); }} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-navy" data-testid="auth-switch">
        {method === "phone" ? <><Mail className="h-4 w-4" /> Wolę zalogować się e-mailem</> : <><Smartphone className="h-4 w-4" /> Wolę numer telefonu</>}
      </button>
    </div>
  );
}

function PhoneForm({ auth, consent, consentBox, onSignedIn, setMsg }: { auth: AuthConfig; consent: boolean; consentBox: React.ReactNode; onSignedIn: () => Promise<void>; setMsg: (m: string | null) => void }) {
  const [phone, setPhone] = useState("");
  const [normalized, setNormalized] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!resendAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [resendAt]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!consent) return setMsg(CONSENT_MSG);
    const n = normalizePhone(phone);
    if (!n) return setMsg("Podaj poprawny numer telefonu komórkowego, np. 600 123 456.");
    setBusy(true);
    setMsg(null);
    try {
      if (auth.demo) {
        const j = await post<{ sent: boolean; testCode?: string; resendInSeconds: number }>("/api/auth/phone/start", { phone: n });
        setTestCode(j.testCode ?? null);
        setResendAt(Date.now() + j.resendInSeconds * 1000);
      } else {
        const { error } = await browserSupabase(auth.supabaseUrl, auth.supabaseAnonKey).auth.signInWithOtp({ phone: n });
        if (error) throw error;
        setResendAt(Date.now() + 45_000);
      }
      setNormalized(n);
      setNow(Date.now());
      setTimeout(() => codeRef.current?.focus({ preventScroll: true }), 50);
    } catch (err) {
      setMsg((err as Error).message);
    }
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized) return;
    setBusy(true);
    setMsg(null);
    try {
      if (auth.demo) {
        await post("/api/auth/phone/verify", { phone: normalized, code });
      } else {
        const { error } = await browserSupabase(auth.supabaseUrl, auth.supabaseAnonKey).auth.verifyOtp({ phone: normalized, token: code, type: "sms" });
        if (error) throw error;
      }
      await onSignedIn();
    } catch (err) {
      setMsg((err as Error).message);
      setBusy(false);
    }
  }

  if (!normalized) {
    return (
      <form onSubmit={send} className="space-y-4">
        <div>
          <Label htmlFor="phone">Twój numer telefonu</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-14 flex-none items-center rounded-2xl border-2 border-navy/10 bg-cream px-4 font-semibold text-navy">🇵🇱 +48</span>
            <Input id="phone" type="tel" required autoComplete="tel-national" inputMode="tel" placeholder="600 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="mt-2 flex items-start gap-2 rounded-2xl bg-sage/15 p-3 text-sm text-navy">
            <MessageSquareText className="mt-0.5 h-4 w-4 flex-none text-sage-deep" />
            Wyślemy Ci SMS z 6-cyfrowym kodem. Wpiszesz go na następnym ekranie — bez haseł do zapamiętania.
          </p>
        </div>
        {consentBox}
        <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="auth-submit">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-5 w-5" />} Wyślij kod SMS
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="rounded-2xl bg-sage/15 p-4 text-center">
        <MessageSquareText className="mx-auto h-7 w-7 text-sage-deep" />
        <p className="mt-2 font-display text-lg font-semibold text-navy">Wysłaliśmy kod na {formatPhone(normalized)}</p>
        <p className="text-sm text-muted">SMS powinien dotrzeć w ciągu kilkunastu sekund. Kod jest ważny 5 minut.</p>
      </div>
      {testCode && (
        <p className="rounded-2xl border-2 border-dashed border-gold bg-gold/10 p-3 text-center text-sm text-navy" data-testid="test-code">
          Tryb testowy (bramka SMS nie jest jeszcze skonfigurowana): Twój kod to <strong className="font-mono text-base tracking-widest">{testCode}</strong>
        </p>
      )}
      <div>
        <Label htmlFor="otp">Kod z SMS</Label>
        <Input
          id="otp"
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="••••••"
          className="text-center font-mono text-2xl tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6} data-testid="otp-submit">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Potwierdź i przejdź dalej
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={() => { setNormalized(null); setCode(""); setTestCode(null); }} className="flex items-center gap-1 font-semibold text-muted hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Zmień numer
        </button>
        <button type="button" disabled={resendIn > 0 || busy} onClick={() => send()} className="font-semibold text-navy underline disabled:text-muted disabled:no-underline">
          {resendIn > 0 ? `Wyślij ponownie za ${resendIn} s` : "Wyślij kod ponownie"}
        </button>
      </div>
    </form>
  );
}

function EmailForm({ auth, next, consent, consentBox, onSignedIn, setMsg, cta = "Wyślij link do logowania" }: { auth: AuthConfig; next: string; consent: boolean; consentBox: React.ReactNode; onSignedIn: () => Promise<void>; setMsg: (m: string | null) => void; cta?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return setMsg(CONSENT_MSG);
    setState("sending");
    setMsg(null);
    try {
      if (auth.demo) {
        await post("/api/auth/demo", { email });
        await onSignedIn();
        return;
      }
      const sb = browserSupabase(auth.supabaseUrl, auth.supabaseAnonKey);
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("idle");
      setMsg((err as Error).message);
    }
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
      {consentBox}
      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"} data-testid="email-submit">
        {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
        {auth.demo ? "Utwórz konto" : cta}
      </Button>
    </form>
  );
}
