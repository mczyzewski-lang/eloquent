"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Save, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { splitGreetingTemplate, type GreetingVariant } from "@/lib/domain/greetings";
import { speakSequence } from "@/lib/client/speech";

async function call(body: unknown) {
  const res = await fetch("/api/admin/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error);
  return j;
}

export function GreetingsAdmin({ bank, cacheCounts, unknownNames }: { bank: GreetingVariant[]; cacheCounts: Record<string, number>; unknownNames: string[] }) {
  const router = useRouter();
  const [testName, setTestName] = useState("Leon");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ url: string; text: string; provider: string; label: string } | null>(null);

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-navy/10 bg-white p-4">
        <div><Label htmlFor="tn">Profil testowy — imię</Label><Input id="tn" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-48" /></div>
        <Button onClick={() => run("set", async () => { const j = await call({ action: "generate_set", childName: testName, locale: "pl" }); setMsg(`Zestaw gotowy: ${j.items.length} powitań dla „${testName}”.`); router.refresh(); })}>
          {busy === "set" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Wygeneruj zestaw powitań
        </Button>
        <Button variant="soft" onClick={() => run("purge", async () => { const j = await call({ action: "purge", childName: testName }); setMsg(`Usunięto z cache: ${j.removed}`); router.refresh(); })}><Trash2 className="h-4 w-4" /> Wyczyść cache imienia</Button>
      </div>
      {msg && <p className="rounded-2xl bg-white p-3 text-sm font-semibold">{msg}</p>}
      {audio && (
        <div className="rounded-2xl border border-gold bg-white p-4">
          <p className="text-xs font-bold text-muted">{audio.label} · {audio.provider}</p>
          <p className="mt-1">{audio.text}</p>
          {audio.provider === "mock" ? (
            <Button size="sm" className="mt-2" onClick={() => speakSequence([audio.text])}><Play className="h-4 w-4" /> Odtwórz (syntezator demo)</Button>
          ) : (
            <audio controls autoPlay src={audio.url} className="mt-2 w-full" />
          )}
        </div>
      )}

      <div className="space-y-3">
        {bank.map((g) => {
          const key = `${g.id}:${g.locale}`;
          const value = edits[key] ?? g.template;
          return (
            <div key={key} className="rounded-2xl border border-navy/10 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-mono text-sm">{g.id}</strong>
                <Badge tone="muted">{g.locale}</Badge>
                <Badge tone="peach">{g.kind}</Badge>
                <span className="text-xs text-muted">cache: {cacheCounts[key] ?? 0}</span>
              </div>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-navy/10 p-3 text-sm" value={value} onChange={(e) => setEdits({ ...edits, [key]: e.target.value })} aria-label={`Tekst ${g.id}`} />
              <p className="mt-1 text-xs leading-relaxed text-muted" data-testid="greeting-split">
                {splitGreetingTemplate(value).map((p, i) => (
                  <span key={i} className={p.personal ? "rounded bg-gold/20 px-1 text-navy" : "px-0.5"} title={p.personal ? "nagrywane osobno dla każdego imienia" : "nagrywane raz, wspólne dla wszystkich dzieci"}>{p.template} </span>
                ))}
                <span className="ml-1 whitespace-nowrap">· <span className="rounded bg-gold/20 px-1 text-navy">zaznaczone</span> = nagranie dla imienia, reszta wspólna dla wszystkich</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="soft" onClick={() => run(`p-${key}`, async () => { const j = await call({ action: "preview", variantId: g.id, locale: g.locale, childName: testName }); setAudio({ url: j.audioUrl, text: j.text, provider: j.provider, label: j.assetLabel }); })}>
                  {busy === `p-${key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Podgląd TTS
                </Button>
                <Button size="sm" variant="soft" disabled={value === g.template} onClick={() => run(`s-${key}`, async () => { await call({ action: "save_template", variantId: g.id, locale: g.locale, template: value, active: true }); setMsg("Zapisano. Nowe nagrania powstaną przy kolejnym użyciu."); router.refresh(); })}><Save className="h-4 w-4" /> Zapisz tekst</Button>
                <Button size="sm" variant="ghost" onClick={() => run(`d-${key}`, async () => { await call({ action: "save_template", variantId: g.id, locale: g.locale, template: value, active: false }); router.refresh(); })}>Wyłącz wariant</Button>
                <Button size="sm" variant="ghost" onClick={() => run(`c-${key}`, async () => { const j = await call({ action: "purge", variantId: g.id }); setMsg(`Usunięto z cache: ${j.removed}`); router.refresh(); })}>Wyczyść cache</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-display text-lg font-semibold">Analiza wymowy i odmiany</p>
        <p className="mt-1 text-sm text-muted">Imiona spoza słownika, dla których rodzic nie wskazał formy zwrotu — Elofik używa mianownika. Odsłuchaj podgląd i w razie potrzeby dodaj zapis fonetyczny do słownika wymowy (src/lib/domain/pronunciation.ts) lub formy do słownika imion.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {unknownNames.length === 0 && <span className="text-sm text-muted">Brak imion do weryfikacji.</span>}
          {unknownNames.map((n) => <button key={n} type="button" onClick={() => setTestName(n)} className="rounded-full bg-peach px-3 py-1 text-sm font-semibold">{n}</button>)}
        </div>
      </div>
    </div>
  );
}
