"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { IllustrationCard, illustrationsApi, type IllustrationView } from "./IllustrationCard";
import type { ImageType, SceneSpec } from "@/lib/ai/elofik-bible";

export interface ReferenceView {
  id: string;
  kind: "master" | "sheet";
  version: number;
  label: string;
  status: "proposed" | "approved" | "retired";
  approvedBy: string | null;
  approvedAt: string | null;
  url: string;
}

type Quality = "low" | "medium" | "high";

export function IllustrationStudio({
  references: initialRefs,
  illustrations: initialIll,
  mascotPoses,
  landingScenes,
  testScenes,
  costs,
  openaiReady,
}: {
  references: ReferenceView[];
  illustrations: IllustrationView[];
  mascotPoses: { slot: string; label: string; scene: SceneSpec }[];
  landingScenes: { slot: string; label: string; where: string; type: ImageType; scene: SceneSpec }[];
  testScenes: { id: string; title: string; type: ImageType; scene: SceneSpec }[];
  costs: Record<Quality, number>;
  openaiReady: boolean;
}) {
  const [refs, setRefs] = useState(initialRefs);
  const [items, setItems] = useState(initialIll);
  const [quality, setQuality] = useState<Quality>("medium");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"master" | "sheet">("master");

  const master = refs.find((r) => r.kind === "master" && r.status === "approved") ?? null;
  const pending = items.filter((i) => i.status === "pending");
  const upsert = (i: IllustrationView) => setItems((list) => [i, ...list.filter((x) => x.id !== i.id)]);
  const latest = useMemo(() => {
    const m = new Map<string, IllustrationView>();
    for (const i of items) {
      const k = `${i.storyId}|${i.imageType}|${i.slot}`;
      if (!m.has(k) || (m.get(k)!.status !== "approved" && i.status === "approved")) m.set(k, i);
    }
    return m;
  }, [items]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(null);
  };

  const generate = (storyId: string, imageType: ImageType, scene: SceneSpec, slot: string | null, regenerate = false) =>
    illustrationsApi<{ illustration: IllustrationView; cached: boolean }>({ action: "generate", storyId, imageType, scene, slot, quality, regenerate }).then((j) => {
      upsert(j.illustration);
      return j;
    });

  const proposedMaster = refs.find((r) => r.kind === "master" && r.status === "proposed") ?? null;
  const siteList = [
    ...landingScenes.map((t) => ({ storyId: "__landing__", type: t.type, scene: t.scene, slot: t.slot })),
  ];

  const approveAllPending = () =>
    run("approve-all", async () => {
      for (const i of pending) {
        const j = await illustrationsApi<{ illustration: IllustrationView }>({ action: "review", id: i.id, decision: "approved" });
        upsert(j.illustration);
      }
      setMsg({ ok: true, text: `Zatwierdzono ${pending.length} ilustracji — pojawią się na stronie w ciągu kilku minut.` });
    });

  const batch = (key: string, list: { storyId: string; type: ImageType; scene: SceneSpec; slot: string | null }[], opts: { approveLogoReference?: boolean } = {}) => {
    const cost = (list.length * costs[quality]).toFixed(2);
    const refNote = opts.approveLogoReference && !master && proposedMaster ? "\n\nNajpierw zatwierdzimy Elofika z logo jako obraz referencyjny." : "";
    if (!confirm(`Wygenerować ${list.length} ilustracji (jakość ${quality})? Szacunkowy koszt: ok. $${cost}. Istniejące (cache) nie zostaną wygenerowane ponownie.${refNote}`)) return;
    void run(key, async () => {
      if (opts.approveLogoReference && !master && proposedMaster) {
        const r = await illustrationsApi<{ reference: ReferenceView }>({ action: "approve_reference", id: proposedMaster.id });
        setRefs((l) => l.map((x) => (x.id === r.reference.id ? r.reference : x)));
      }
      let done = 0;
      let cached = 0;
      for (const x of list) {
        const j = await generate(x.storyId, x.type, x.scene, x.slot);
        done++;
        if (j.cached) cached++;
        setMsg({ ok: true, text: `Postęp: ${done}/${list.length}${cached ? ` (z cache: ${cached})` : ""}…` });
      }
      setMsg({ ok: true, text: `Gotowe: ${done} ilustracji czeka na akceptację poniżej.` });
    });
  };

  return (
    <div className="space-y-8">
      {!openaiReady && (
        <p className="rounded-2xl border-2 border-gold bg-gold/10 p-4 text-sm text-navy">
          <strong>Tryb demo:</strong> brak klucza OpenAI — obrazy nie są generowane (interfejs działa, nic nie jest udawane). Dodaj klucz i budżet w Ustawieniach.
        </p>
      )}
      {/* Szybki start: wszystkie grafiki strony z OpenAI */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/50 bg-gold/10 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">Grafiki Elofika na stronę — jednym kliknięciem</p>
          <p className="text-sm text-muted">
            {landingScenes.length} scen strony (hero, rytuał, słowo dnia, rodzina, dobranoc) generowanych w OpenAI z obrazem wzorcowym nowego Elofika i stałym opisem postaci. Pozy Elofika w całym serwisie pochodzą z grafik marki — nie trzeba ich generować. Po wygenerowaniu przejrzyj sceny i zatwierdź.
          </p>
        </div>
        <Button disabled={!!busy || !openaiReady || (!master && !proposedMaster)} onClick={() => batch("site-all", siteList, { approveLogoReference: true })} data-testid="gen-site-all">
          {busy === "site-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Wygeneruj wszystkie grafiki strony ({siteList.length})
        </Button>
      </section>

      {msg && <p role="status" className={msg.ok ? "rounded-2xl bg-sage/20 p-3 text-sm font-semibold text-sage-deep" : "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"}>{msg.text}</p>}

      {/* 1. Referencja */}
      <section className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4">
        <h2 className="text-xl font-semibold">1. Obraz referencyjny Elofika (master reference)</h2>
        <p className="text-sm text-muted">Dołączany do KAŻDEGO generowania jako jedyne źródło prawdy o wyglądzie postaci. Bez zatwierdzonej referencji generowanie jest zablokowane. Nowa wersja mastera wycofuje poprzednią (bez mieszania kanonów).</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {refs.filter((r) => r.status !== "retired").map((r) => (
            <div key={r.id} className={`rounded-2xl border-2 p-3 ${r.status === "approved" ? "border-sage-deep" : "border-navy/10"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={r.label} className="w-full rounded-xl bg-cream" />
              <p className="mt-2 text-sm font-semibold">{r.kind === "master" ? "Master" : "Character sheet"} v{r.version}</p>
              <p className="text-xs text-muted">{r.label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "approved" ? "sage" : "gold"}>{r.status === "approved" ? `zatwierdzona${r.approvedBy ? ` · ${r.approvedBy}` : ""}` : "propozycja"}</Badge>
                {r.status === "proposed" && (
                  <Button size="sm" variant="sage" disabled={!!busy} onClick={() => run(`ref-${r.id}`, async () => { const j = await illustrationsApi<{ reference: ReferenceView }>({ action: "approve_reference", id: r.id }); setRefs((l) => l.map((x) => (x.id === r.id ? j.reference : r.kind === "master" && x.kind === "master" && x.status === "approved" ? { ...x, status: "retired" } : x))); setMsg({ ok: true, text: "Referencja zatwierdzona — od teraz każda ilustracja jest generowana z tym wzorem." }); })} data-testid="approve-reference">
                    <CheckCircle2 className="h-4 w-4" /> Zatwierdź
                  </Button>
                )}
                {r.status === "approved" && r.kind === "sheet" && (
                  <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(`ret-${r.id}`, async () => { await illustrationsApi({ action: "retire_reference", id: r.id }); setRefs((l) => l.map((x) => (x.id === r.id ? { ...x, status: "retired" } : x))); })}>Wycofaj</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          className="grid gap-2 rounded-2xl bg-navy/5 p-3 sm:grid-cols-[1fr_1fr_150px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            void run("upload", async () => {
              const fd = new FormData();
              fd.set("file", file);
              fd.set("label", label || file.name);
              fd.set("kind", kind);
              const res = await fetch("/api/admin/illustrations", { method: "POST", body: fd });
              const j = await res.json();
              if (!res.ok) throw new Error(j.error);
              setRefs((l) => [j.reference, ...l]);
              setMsg({ ok: true, text: "Wgrano — zatwierdź, aby zaczęła obowiązywać." });
            });
          }}
        >
          <div><Label htmlFor="ref-file">Wgraj nową referencję (PNG/WEBP/JPEG)</Label><input id="ref-file" type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" /></div>
          <div><Label htmlFor="ref-label">Opis</Label><Input id="ref-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" /></div>
          <div>
            <Label htmlFor="ref-kind">Rodzaj</Label>
            <select id="ref-kind" value={kind} onChange={(e) => setKind(e.target.value as "master" | "sheet")} className="h-11 w-full rounded-xl border border-navy/10 bg-white px-2"><option value="master">Master</option><option value="sheet">Character sheet</option></select>
          </div>
          <Button type="submit" size="sm" disabled={!file || !!busy}>{busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Wgraj</Button>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="quality" className="mb-0">Jakość generowania</Label>
        <select id="quality" value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className="h-10 rounded-xl border border-navy/10 bg-white px-2">
          <option value="low">low (~${costs.low.toFixed(2)})</option>
          <option value="medium">medium (~${costs.medium.toFixed(2)})</option>
          <option value="high">high (~${costs.high.toFixed(2)})</option>
        </select>
        {!master && <span className="text-sm font-semibold text-red-700">Zatwierdź referencję, aby generować.</span>}
      </div>

      {/* 2. Do akceptacji */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">2. Do akceptacji ({pending.length})</h2>
          {pending.length > 1 && (
            <Button size="sm" variant="sage" disabled={!!busy} onClick={() => { if (confirm(`Zatwierdzić wszystkie ${pending.length} ilustracje? Sprawdź wcześniej listę kontrolną przy każdej.`)) void approveAllPending(); }} data-testid="approve-all">
              {busy === "approve-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Zatwierdź wszystkie
            </Button>
          )}
        </div>
        {pending.length === 0 && <p className="text-sm text-muted">Brak ilustracji oczekujących na akceptację.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((i) => (
            <IllustrationCard key={i.id} item={i} referenceUrl={master?.url ?? null} onChange={upsert} onRegenerate={async () => { await generate(i.storyId, i.imageType, i.scene as unknown as SceneSpec, i.slot, true); }} />
          ))}
        </div>
      </section>

      {/* 3. Maskotka — grafiki marki */}
      <section className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-muted">
        <h2 className="text-xl font-semibold text-navy">3. Elofik na stronie</h2>
        <p className="mt-1">Pozy Elofika (spokojny, radosny, zaskoczony, zaciekawiony, zamyślony, senny) to grafiki dostarczone przez właściciela marki — używane w całym serwisie i jako obraz wzorcowy dla OpenAI. Grafiki wygenerowane wcześniej ze starym wyglądem nie są już publikowane.</p>
      </section>

      {/* 3b. Grafiki strony */}
      <section className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Grafiki strony głównej (sceny z Elofikiem)</h2>
          <Button size="sm" disabled={!!busy || !master || !openaiReady} onClick={() => batch("landing", landingScenes.map((t) => ({ storyId: "__landing__", type: t.type, scene: t.scene, slot: t.slot })))} data-testid="gen-landing">
            {busy === "landing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Wygeneruj wszystkie ({landingScenes.length})
          </Button>
        </div>
        <p className="text-sm text-muted">Generowane z zatwierdzoną referencją i stałym opisem postaci. Po akceptacji (sekcja „Do akceptacji”) pojawiają się na stronie w ciągu kilku minut; do tego czasu strona pokazuje wersję wektorową.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {landingScenes.map((t) => {
            const cur = latest.get(`__landing__|${t.type}|${t.slot}`);
            return (
              <div key={t.slot} className="rounded-xl border border-navy/10 p-2 text-xs">
                <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cur?.url ? <img src={cur.url} alt={t.label} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted" />}
                </div>
                <p className="mt-1 font-semibold">{t.label}</p>
                <p className="text-muted">{t.where}</p>
                {cur && <Badge tone={cur.status === "approved" ? "sage" : cur.status === "pending" ? "gold" : "muted"}>{cur.status}</Badge>}
                <button type="button" disabled={!!busy || !master || !openaiReady} className="mt-1 block text-muted underline disabled:opacity-40" onClick={() => run(`l-${t.slot}`, async () => { await generate("__landing__", t.type, t.scene, t.slot, Boolean(cur)); })}>
                  {busy === `l-${t.slot}` ? "generuję…" : cur ? "nowa wersja" : "generuj"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Sceny testowe */}
      <section className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">4. Test spójności: 10 scen</h2>
          <Button size="sm" variant="soft" disabled={!!busy || !master || !openaiReady} onClick={() => batch("tests", testScenes.map((t) => ({ storyId: "__test__", type: t.type, scene: t.scene, slot: t.id })))}>
            {busy === "tests" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Wygeneruj 10 scen testowych
          </Button>
        </div>
        <p className="text-sm text-muted">Ten sam stały prompt i ta sama referencja, różne miejsca i emocje — sprawdzenie, czy to zawsze ten sam Elofik. Nie są publikowane.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {testScenes.map((t) => {
            const cur = latest.get(`__test__|${t.type}|${t.id}`);
            return (
              <div key={t.id} className="rounded-xl border border-navy/10 p-2 text-xs">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cur?.url ? <img src={cur.url} alt={t.title} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted" />}
                </div>
                <p className="mt-1 font-semibold">{t.id}. {t.title}</p>
                <p className="text-muted">{t.type}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
