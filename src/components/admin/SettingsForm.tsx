"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, PlugZap, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { SettingView } from "@/lib/settings/runtime";

const SOURCE: Record<SettingView["source"], { label: string; tone: "sage" | "gold" | "muted" }> = {
  panel: { label: "ustawione w panelu", tone: "sage" },
  env: { label: "ze zmiennej środowiskowej", tone: "gold" },
  none: { label: "brak", tone: "muted" },
};

export function SettingsForm({ initial }: { initial: SettingView[] }) {
  const [settings, setSettings] = useState(initial);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tests, setTests] = useState<Record<string, { ok: boolean; message: string }>>({});

  async function post(body: unknown) {
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw Object.assign(new Error(j.error ?? "Błąd"), { fields: j.fields });
    return j;
  }

  async function save(clearKey?: string) {
    const payload = clearKey ? { [clearKey]: "" } : Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
    if (!Object.keys(payload).length) return setMsg({ ok: false, text: "Wpisz co najmniej jedną wartość." });
    setBusy(clearKey ?? "save");
    setMsg(null);
    setFieldErrors({});
    try {
      const j = await post({ action: "save", values: payload });
      setSettings(j.settings);
      setValues({});
      setMsg({ ok: true, text: clearKey ? "Usunięto wartość z panelu." : "Zapisano. Klucze działają od razu, bez restartu." });
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setFieldErrors(err.fields ?? {});
      setMsg({ ok: false, text: err.message });
    }
    setBusy(null);
  }

  async function test(provider: "elevenlabs" | "openai") {
    setBusy(`test-${provider}`);
    try {
      const j = await post({ action: "test", provider });
      setTests((t) => ({ ...t, [provider]: j }));
    } catch (e) {
      setTests((t) => ({ ...t, [provider]: { ok: false, message: (e as Error).message } }));
    }
    setBusy(null);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4"
      autoComplete="off"
    >
      {settings.map((s) => (
        <div key={s.key} className="rounded-2xl border border-navy/10 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={s.key} className="mb-0 flex items-center gap-2">
              {s.secret && <KeyRound className="h-4 w-4 text-gold-deep" />} {s.label}
            </Label>
            <Badge tone={SOURCE[s.source].tone}>{SOURCE[s.source].label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">{s.help}</p>
          {s.display && (
            <p className="mt-2 text-sm">
              Aktualnie: <code className="rounded bg-navy/5 px-1.5 py-0.5">{s.display}</code>
              {s.updatedBy && <span className="text-muted"> · zmienił(a) {s.updatedBy}, {new Date(s.updatedAt!).toLocaleString("pl-PL")}</span>}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Input
              id={s.key}
              name={s.key}
              type={s.secret ? "password" : s.key === "ai_monthly_budget_usd" ? "number" : "text"}
              inputMode={s.key === "ai_monthly_budget_usd" ? "decimal" : undefined}
              autoComplete={s.secret ? "new-password" : "off"}
              spellCheck={false}
              placeholder={s.display ? "Wpisz nową wartość, aby zmienić" : s.placeholder}
              value={values[s.key] ?? ""}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              aria-invalid={Boolean(fieldErrors[s.key])}
              className="h-12 text-base"
            />
            {s.source === "panel" && (
              <Button type="button" variant="ghost" size="sm" className="h-12" onClick={() => void save(s.key)} disabled={!!busy}>
                Wyczyść
              </Button>
            )}
          </div>
          {fieldErrors[s.key] && <p className="mt-1 text-sm font-semibold text-red-600">{fieldErrors[s.key]}</p>}
        </div>
      ))}

      <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
        {busy === "save" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Zapisz ustawienia
      </Button>
      {msg && (
        <p role="status" className={msg.ok ? "rounded-2xl bg-sage/20 p-3 text-sm font-semibold text-sage-deep" : "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"}>
          {msg.text}
        </p>
      )}

      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-display text-lg font-semibold">Test połączenia</p>
        <p className="mt-1 text-sm text-muted">Sprawdza zapisane klucze bez generowania płatnych treści.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["elevenlabs", "openai"] as const).map((p) => (
            <div key={p}>
              <Button type="button" variant="soft" className="w-full" onClick={() => void test(p)} disabled={!!busy}>
                {busy === `test-${p}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Testuj {p === "elevenlabs" ? "ElevenLabs" : "OpenAI"}
              </Button>
              {tests[p] && (
                <p className={`mt-2 flex items-start gap-1.5 text-sm ${tests[p].ok ? "text-sage-deep" : "text-red-700"}`}>
                  {tests[p].ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <XCircle className="mt-0.5 h-4 w-4 flex-none" />} {tests[p].message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
