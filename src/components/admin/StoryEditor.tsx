"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, ImageIcon, Loader2, Mic2, Plus, Rocket, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { SegmentType, StorySegment, StoryVersion } from "@/lib/domain/story";
import { cn } from "@/lib/utils";

const TYPES: SegmentType[] = ["CORE", "PERSONALIZED_CHILD", "PERSONALIZED_FAMILY", "OPTIONAL", "EDUCATIONAL"];
const TYPE_TONE: Record<SegmentType, string> = { CORE: "bg-navy/5", EDUCATIONAL: "bg-sage/15", PERSONALIZED_CHILD: "bg-gold/20", PERSONALIZED_FAMILY: "bg-peach/60", OPTIONAL: "bg-teal/15" };

type TextField = "title" | "wordOfDay" | "wordDefinition" | "educationalGoal" | "summary" | "ending" | "parentQuestion" | "illustrationPrompt";
const FIELDS: { key: TextField; label: string; hint?: string; span: string; multiline?: number }[] = [
  { key: "title", label: "Tytuł", span: "md:col-span-3" },
  { key: "wordOfDay", label: "Słowo dnia", span: "md:col-span-2" },
  { key: "wordDefinition", label: "Definicja słowa dnia", hint: "Jak wytłumaczyć słowo 5-latkowi", span: "md:col-span-6", multiline: 2 },
  { key: "educationalGoal", label: "Cel edukacyjny", span: "md:col-span-3", multiline: 2 },
  { key: "parentQuestion", label: "Pytanie dla rodzica (po bajce)", span: "md:col-span-3", multiline: 2 },
  { key: "summary", label: "Streszczenie", span: "md:col-span-6", multiline: 3 },
  { key: "ending", label: "Zakończenie (wyciszenie przed snem)", span: "md:col-span-6", multiline: 2 },
  { key: "illustrationPrompt", label: "Opis sceny do ilustracji (po angielsku)", span: "md:col-span-6", multiline: 2 },
];

async function call(body: unknown) {
  const res = await fetch("/api/admin/stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw Object.assign(new Error(j.error), { issues: j.issues });
  return j;
}

export function StoryEditor({ initial, status, issues: initialIssues, versions, coverUrl: initialCover }: { initial: StoryVersion; status: string; issues: string[]; versions: { version: number; reviewedBy: string | null; createdAt: string }[]; coverUrl?: string | null }) {
  const coverUrl = initialCover ?? null;
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [issues, setIssues] = useState(initialIssues);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ plan: { segments: { segmentId: string; type: string; text: string; shared: boolean }[] }; audioUrl: string | null } | null>(null);
  const [testName, setTestName] = useState("Leon");
  const [testFamily, setTestFamily] = useState("mom=Monika, dad=Marek, grandma=Basia, grandpa=Jan, dog=Burek");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      const err = e as Error & { issues?: string[] };
      setMsg(err.message);
      if (err.issues) setIssues(err.issues);
    }
    setBusy(null);
  };

  const updateSeg = (i: number, patch: Partial<StorySegment>) => setS({ ...s, segments: s.segments.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const family = Object.fromEntries(testFamily.split(",").map((p) => p.trim().split("=")).filter((p) => p.length === 2 && p[1]));
  const words = s.segments.map((x) => x.text).join(" ").split(/\s+/).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">Dzień {s.dayNumber}: {s.title}</h1>
        <Badge tone={status === "published" ? "sage" : "gold"}>{status}</Badge>
        <span className="text-sm text-muted">v{s.version} · {words} słów · ok. {Math.round(words / 110)} min</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run("save", async () => { const j = await call({ action: "save", story: s }); setS(j.story); setIssues(j.issues); setMsg("Zapisano nową wersję."); })} disabled={!!busy}>{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Zapisz wersję</Button>
        <Button size="sm" variant="sage" onClick={() => run("approve", async () => { await call({ action: "approve", storyId: s.storyId }); setMsg("Zatwierdzono."); })} disabled={!!busy}><CheckCircle2 className="h-4 w-4" /> Zatwierdź</Button>
        <Button size="sm" variant="soft" onClick={() => run("core", async () => { const j = await call({ action: "generate_core", storyId: s.storyId }); setMsg(`CORE: wygenerowano ${j.generated} z ${j.total} wspólnych segmentów (reszta z cache).`); })} disabled={!!busy}><Mic2 className="h-4 w-4" /> Generuj CORE</Button>
        <Button size="sm" variant="navy" onClick={() => run("publish", async () => { await call({ action: "publish", storyId: s.storyId }); setMsg("Opublikowano."); })} disabled={!!busy}><Rocket className="h-4 w-4" /> Publikuj</Button>
        <Button size="sm" variant="ghost" onClick={() => run("archive", async () => { await call({ action: "archive", storyId: s.storyId }); })} disabled={!!busy}>Archiwizuj</Button>
      </div>
      {msg && <p className="rounded-2xl bg-white p-3 text-sm font-semibold" role="status">{msg}</p>}
      {coverUrl && (
        <div className="max-w-sm">
          <p className="text-xs font-bold uppercase text-muted">Zatwierdzona okładka</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt={`Okładka: ${s.title}`} className="mt-1 w-full rounded-2xl border border-navy/10" />
        </div>
      )}
      {issues.length > 0 && (
        <ul className="rounded-2xl bg-peach/60 p-4 text-sm">
          {issues.map((i) => <li key={i}>• {i}</li>)}
        </ul>
      )}

      <div className="grid gap-x-4 gap-y-3 rounded-2xl border border-navy/10 bg-white p-4 md:grid-cols-6">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.span}>
            <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
            {f.multiline ? (
              <textarea id={`f-${f.key}`} rows={f.multiline} className="w-full" placeholder={f.hint} value={String(s[f.key] ?? "")} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
            ) : (
              <Input id={`f-${f.key}`} placeholder={f.hint} value={String(s[f.key] ?? "")} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="md:col-span-1">
          <Label htmlFor="f-day">Numer dnia</Label>
          <Input id="f-day" type="number" min={1} value={s.dayNumber} onChange={(e) => setS({ ...s, dayNumber: Number(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Segmenty</h2>
        <p className="text-sm text-muted">Zmienne: {"{child}"} (zwrot), {"{child.name}"}, {"{mom} {dad} {grandma} {grandpa} {brother} {sister} {dog} {cat} {other}"} — zawsze w mianowniku; rodzaj: {"{g:męska|żeńska|neutralna}"}. Dwa głosy: kwestie po pauzie „—” czyta Elofik, resztę narrator (np. „— Hej! — zawołał Elofik.”); wymuszenie głosu: [narrator] / [elofik].</p>
        {s.segments.map((seg, i) => (
          <div key={i} className={cn("rounded-2xl border border-navy/10 p-4", TYPE_TONE[seg.type])}>
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-40 font-mono text-xs" value={seg.id} onChange={(e) => updateSeg(i, { id: e.target.value })} aria-label="ID segmentu" />
              <select value={seg.type} onChange={(e) => updateSeg(i, { type: e.target.value as SegmentType })} className="rounded-xl border border-navy/10 bg-white px-2 text-sm">
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <Input className="w-24" type="number" value={seg.pauseAfterMs ?? 450} onChange={(e) => updateSeg(i, { pauseAfterMs: Number(e.target.value) })} aria-label="Pauza po (ms)" />
              <button type="button" className="ml-auto p-2 text-muted hover:text-red-600" aria-label="Usuń segment" onClick={() => setS({ ...s, segments: s.segments.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-navy/10 bg-white p-3 text-sm" value={seg.text} onChange={(e) => updateSeg(i, { text: e.target.value })} aria-label="Tekst segmentu" />
            {seg.type !== "CORE" && seg.type !== "EDUCATIONAL" && (
              <textarea className="mt-2 min-h-16 w-full rounded-xl border border-dashed border-navy/20 bg-white/70 p-3 text-sm" placeholder="Tekst zastępczy (gdy brak osoby)" value={seg.fallbackText ?? ""} onChange={(e) => updateSeg(i, { fallbackText: e.target.value || null })} aria-label="Fallback" />
            )}
          </div>
        ))}
        <Button variant="soft" size="sm" onClick={() => setS({ ...s, segments: [...s.segments, { id: `seg-${s.segments.length + 1}`, order: s.segments.length, type: "CORE", text: "" }] })}><Plus className="h-4 w-4" /> Dodaj segment</Button>
      </div>

      <div className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4">
        <h2 className="text-xl font-semibold">Podgląd personalizacji</h2>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto_auto] sm:items-end">
          <div><Label htmlFor="tn">Imię testowe</Label><Input id="tn" value={testName} onChange={(e) => setTestName(e.target.value)} /></div>
          <div><Label htmlFor="tf">Rodzina (relacja=imię)</Label><Input id="tf" value={testFamily} onChange={(e) => setTestFamily(e.target.value)} /></div>
          <Button variant="soft" onClick={() => run("prev", async () => setPreview(await call({ action: "preview", storyId: s.storyId, childName: testName, family })))}><Eye className="h-4 w-4" /> Tekst</Button>
          <Button variant="soft" onClick={() => run("prevA", async () => setPreview(await call({ action: "preview", storyId: s.storyId, childName: testName, family, audio: true })))}>{busy === "prevA" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />} Audio</Button>
        </div>
        {preview?.audioUrl && <audio controls src={preview.audioUrl} className="w-full" />}
        {preview && (
          <ol className="space-y-2 text-sm">
            {preview.plan.segments.map((p) => (
              <li key={p.segmentId} className={cn("rounded-xl p-2", p.shared ? "bg-navy/5" : "bg-gold/20")}>
                <strong>{p.segmentId}</strong> <span className="text-xs text-muted">{p.type} · {p.shared ? "wspólny (cache dla wszystkich)" : "personalizowany"}</span>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-4 text-sm">
        <p className="font-semibold">Historia wersji</p>
        <ul className="mt-2 space-y-1">{versions.map((v) => <li key={v.version}>v{v.version} · {new Date(v.createdAt).toLocaleString("pl-PL")} {v.reviewedBy ? `· zatwierdził: ${v.reviewedBy}` : ""}</li>)}</ul>
      </div>
    </div>
  );
}
