"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Library, Loader2, Mic2, Star, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

interface Candidate {
  id: string;
  source: "design" | "library";
  name: string;
  description: string;
  voiceId: string | null;
  designed: boolean;
  previewUrl: string | null;
  modelDemos?: { model: string; url: string | null; error: string | null }[];
  createdAt: string;
}

interface LibraryVoice {
  voiceId: string;
  name: string;
  category: string | null;
  description: string | null;
  previewUrl: string | null;
  languages: string[];
}

async function call<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/admin/voices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Błąd ${res.status}`);
  return j as T;
}

export function VoiceStudio({
  initial,
  presets,
  demoText,
  current: initialCurrent,
  keyConfigured,
  realTts,
}: {
  initial: Candidate[];
  presets: { name: string; description: string }[];
  demoText: string;
  current: { voiceId: string | null; version: string; model: string };
  keyConfigured: boolean;
  realTts: boolean;
}) {
  const [candidates, setCandidates] = useState(initial);
  const [current, setCurrent] = useState(initialCurrent);
  const [name, setName] = useState(presets[0].name);
  const [description, setDescription] = useState(presets[0].description);
  const [text, setText] = useState(demoText);
  const [model, setModel] = useState("eleven_multilingual_ttv_v2");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [library, setLibrary] = useState<LibraryVoice[] | null>(null);

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

  const design = (preset?: { name: string; description: string }) =>
    run(`design-${preset?.name ?? "custom"}`, async () => {
      const j = await call<{ candidates: Candidate[] }>({ action: "design", name: preset?.name ?? name, description: preset?.description ?? description, model, text });
      setCandidates((c) => [...j.candidates, ...c]);
      setMsg({ ok: true, text: `Gotowe: ${j.candidates.length} nowych głosów do odsłuchania.` });
    });

  const designAll = () =>
    run("design-all", async () => {
      let total = 0;
      for (const p of presets) {
        const j = await call<{ candidates: Candidate[] }>({ action: "design", name: p.name, description: p.description, model, text });
        total += j.candidates.length;
        setCandidates((c) => [...j.candidates, ...c]);
      }
      setMsg({ ok: true, text: `Gotowe: ${total} kandydatów z ${presets.length} stylów. Odsłuchaj i wybierz wiodący.` });
    });

  const choose = (c: Candidate, ttsModel?: string) =>
    run(`choose-${c.id}-${ttsModel ?? ""}`, async () => {
      const j = await call<{ voiceId: string; version: string; model: string }>({ action: "choose", voiceId: c.voiceId ?? "", candidateId: c.voiceId ? undefined : c.id, model: ttsModel ?? null });
      setCurrent({ voiceId: j.voiceId, version: j.version, model: j.model });
      setCandidates((list) => list.map((x) => (x.id === c.id ? { ...x, voiceId: j.voiceId } : x)));
      setMsg({ ok: true, text: `„${c.name}” (${j.model}) jest teraz głosem Elofika — wersja ${j.version}.` });
    });

  const replace = (c: Candidate) => setCandidates((list) => list.map((x) => (x.id === c.id ? c : x)));

  const ttsModelsList = async () => (await call<{ models: { id: string; name: string }[]; designModels: string[] }>({ action: "tts_models" }));

  const compareModels = (c: Candidate) =>
    run(`cmp-${c.id}`, async () => {
      const { models } = await ttsModelsList();
      if (!confirm(`Demo „${c.name}” w ${models.length} modelach TTS (${models.map((m) => m.id).join(", ")})? Koszt: ok. ${models.length} × tekst demo w kredytach ElevenLabs. Głos zostanie zapisany w Twojej bibliotece.`)) return;
      replace((await call<{ candidate: Candidate }>({ action: "model_demos", candidateId: c.id, models: models.map((m) => m.id) })).candidate);
    });

  /** Pełny test: każdy styl × każdy model Voice Design, a każdy powstały głos czyta demo w każdym modelu TTS z obsługą polskiego. */
  const fullTest = () =>
    run("full", async () => {
      const { models, designModels } = await ttsModelsList();
      const estVoices = presets.length * designModels.length * 3;
      if (!confirm(`Pełny test głosów Elofika:\n• ${presets.length} style × ${designModels.length} modele Voice Design (${designModels.join(", ")}) ≈ ${estVoices} głosów\n• każdy przeczyta demo w ${models.length} modelach TTS: ${models.map((m) => m.id).join(", ")}\n\nSzacunkowo ${estVoices * (models.length + 1)} nagrań po ok. ${text.length} znaków (kredyty ElevenLabs). Wszystkie głosy zostaną zapisane w Twojej bibliotece ElevenLabs (sprawdź limit miejsc na głosy w planie). Kontynuować?`)) return;
      const created: Candidate[] = [];
      for (const p of presets) {
        for (const dm of designModels) {
          setMsg({ ok: true, text: `Projektuję „${p.name}” (${dm})…` });
          try {
            const j = await call<{ candidates: Candidate[] }>({ action: "design", name: `${p.name} · ${dm.replace("eleven_", "")}`, description: p.description, model: dm, text });
            created.push(...j.candidates);
            setCandidates((c) => [...j.candidates, ...c]);
          } catch (e) {
            setMsg({ ok: false, text: `${p.name} (${dm}): ${(e as Error).message}` });
          }
        }
      }
      for (const [i, c] of created.entries()) {
        setMsg({ ok: true, text: `Demo w modelach TTS: ${i + 1}/${created.length} (${c.name})…` });
        try {
          replace((await call<{ candidate: Candidate }>({ action: "model_demos", candidateId: c.id, models: models.map((m) => m.id) })).candidate);
        } catch (e) {
          setMsg({ ok: false, text: `${c.name}: ${(e as Error).message}` });
        }
      }
      setMsg({ ok: true, text: `Gotowe: ${created.length} głosów, każdy w ${models.length} modelach TTS. Odsłuchaj poniżej i wybierz głos + model.` });
    });

  return (
    <div className="space-y-6">
      {!keyConfigured && (
        <p className="rounded-2xl bg-peach p-4 text-sm text-navy">
          Brak klucza ElevenLabs. Dodaj go w <Link href="/admin/ustawienia" className="font-semibold underline">Ustawieniach</Link> (wymagane uprawnienia: Text to Speech, Voices — zapis i odczyt, Text to Voice) oraz ustaw budżet AI większy od 0.
        </p>
      )}

      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Aktualny głos Elofika</p>
        {current.voiceId ? (
          <p className="mt-1 font-semibold text-navy">
            {candidates.find((c) => c.voiceId === current.voiceId)?.name ?? "Głos z ustawień"} · <code className="text-sm">{current.voiceId}</code> · {current.model} · {current.version}
          </p>
        ) : (
          <p className="mt-1 text-muted">Nie wybrano{realTts ? "" : " — do czasu wyboru głosu aplikacja używa dźwięku zastępczego i syntezatora przeglądarki"}.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-gold bg-gold/10 p-4">
        <div className="flex-1">
          <p className="font-display text-lg font-semibold text-navy">Pełny test głosów jednym kliknięciem</p>
          <p className="text-sm text-muted">Wszystkie style × modele Voice Design (v2, v3), a każdy głos czyta to samo demo w każdym modelu TTS z polskim dostępnym na Twoim koncie (np. v2, v3 i nowszych). Przed startem pokażemy liczbę nagrań.</p>
        </div>
        <Button size="lg" onClick={fullTest} disabled={!!busy || !keyConfigured} data-testid="full-voice-test">
          {busy === "full" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} Uruchom pełny test
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">1. Zaprojektuj kandydatów</p>
          <Button onClick={designAll} disabled={!!busy || !keyConfigured} data-testid="design-all">
            {busy === "design-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Wygeneruj kandydatów ze wszystkich stylów
          </Button>
        </div>
        <p className="text-sm text-muted">Każdy styl daje zwykle 3 różne głosy. Generowanie jednego stylu trwa ok. 20–60 s. Koszt: kredyty ElevenLabs za tekst demo × liczba głosów.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setName(p.name);
                setDescription(p.description);
              }}
              className={`rounded-2xl border-2 p-3 text-left text-sm transition ${name === p.name ? "border-gold-deep bg-gold/10" : "border-navy/10"}`}
            >
              <span className="font-semibold text-navy">{p.name}</span>
              <span className="mt-1 line-clamp-3 block text-xs text-muted">{p.description}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div><Label htmlFor="vname">Nazwa stylu</Label><Input id="vname" value={name} onChange={(e) => setName(e.target.value)} className="h-12" /></div>
          <div>
            <Label htmlFor="vmodel">Model Voice Design</Label>
            <select id="vmodel" value={model} onChange={(e) => setModel(e.target.value)} className="h-12 w-full rounded-2xl border-2 border-navy/10 bg-white px-3">
              <option value="eleven_multilingual_ttv_v2">eleven_multilingual_ttv_v2</option>
              <option value="eleven_ttv_v3">eleven_ttv_v3</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="vdesc">Opis głosu (po angielsku działa najlepiej)</Label>
          <textarea id="vdesc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-2xl border-2 border-navy/10 p-3 text-sm" />
        </div>
        <div>
          <Label htmlFor="vtext">Tekst demo ({text.length} znaków, min. 100)</Label>
          <textarea id="vtext" value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 w-full rounded-2xl border-2 border-navy/10 p-3 text-sm" />
        </div>
        <Button variant="soft" onClick={() => design()} disabled={!!busy || !keyConfigured || text.length < 100}>
          {busy === "design-custom" || busy === `design-${name}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />} Wygeneruj tylko ten styl
        </Button>
      </div>

      {msg && <p role="status" className={msg.ok ? "rounded-2xl bg-sage/20 p-3 text-sm font-semibold text-sage-deep" : "rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"}>{msg.text}</p>}

      <div className="space-y-3">
        <p className="font-display text-lg font-semibold">2. Odsłuchaj i wybierz wiodący</p>
        {candidates.length === 0 && <p className="text-sm text-muted">Brak kandydatów — wygeneruj ich powyżej albo odsłuchaj głosy z biblioteki.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {candidates.map((c) => {
            const isCurrent = Boolean(c.voiceId && c.voiceId === current.voiceId);
            return (
              <div key={c.id} className={`rounded-2xl border-2 bg-white p-4 ${isCurrent ? "border-sage-deep" : "border-navy/10"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy">{c.name}</p>
                  <Badge tone={c.source === "design" ? "peach" : "muted"}>{c.source === "design" ? "Voice Design" : "biblioteka"}</Badge>
                  {isCurrent && <Badge tone="sage"><Star className="h-3 w-3" /> wiodący</Badge>}
                </div>
                {c.previewUrl ? <audio controls preload="none" src={c.previewUrl} className="mt-3 w-full" /> : <p className="mt-3 text-sm text-muted">Brak próbki.</p>}
                {c.previewUrl && <p className="mt-1 text-xs text-muted">Podgląd z Voice Design</p>}
                {(c.modelDemos ?? []).length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-navy/5 pt-3">
                    {c.modelDemos!.map((d) => {
                      const isCur = isCurrent && current.model === d.model;
                      return (
                        <li key={d.model} className={`rounded-xl p-2 ${isCur ? "bg-sage/15" : "bg-navy/5"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="text-xs font-semibold">{d.model}</code>
                            {d.url && (
                              <Button size="sm" variant={isCur ? "sage" : "soft"} className="h-8 px-3 text-xs" disabled={!!busy || isCur} onClick={() => choose(c, d.model)}>
                                {isCur ? "Wybrany" : "Wybierz głos + ten model"}
                              </Button>
                            )}
                          </div>
                          {d.url ? <audio controls preload="none" src={d.url} className="mt-1 h-9 w-full" /> : <p className="mt-1 text-xs text-red-700">{d.error}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={isCurrent ? "sage" : "primary"} disabled={!!busy || isCurrent} onClick={() => choose(c)} data-testid="choose-voice">
                    {busy?.startsWith(`choose-${c.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {isCurrent ? "Wiodący głos" : "Ustaw jako głos Elofika"}
                  </Button>
                  <Button size="sm" variant="soft" disabled={!!busy || !keyConfigured} onClick={() => compareModels(c)}>
                    {busy === `cmp-${c.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />} {(c.modelDemos ?? []).length ? "Odśwież modele" : "Porównaj modele v2/v3/…"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!!busy || isCurrent} onClick={() => run(`del-${c.id}`, async () => { await call({ action: "delete", candidateId: c.id }); setCandidates((l) => l.filter((x) => x.id !== c.id)); })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {c.designed && !c.voiceId && <p className="mt-2 text-xs text-muted">Po wyborze głos zostanie zapisany w Twojej bibliotece ElevenLabs.</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">Albo: głosy z Twojej biblioteki ElevenLabs</p>
          <Button variant="soft" size="sm" disabled={!!busy || !keyConfigured} onClick={() => run("library", async () => setLibrary((await call<{ voices: LibraryVoice[] }>({ action: "library" })).voices))}>
            {busy === "library" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4" />} Pokaż głosy
          </Button>
        </div>
        {library && (
          <ul className="divide-y divide-navy/5">
            {library.map((v) => (
              <li key={v.voiceId} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold text-navy">{v.name}</p>
                  <p className="text-xs text-muted">{[v.category, v.languages.join(", "), v.description].filter(Boolean).join(" · ")}</p>
                </div>
                {v.previewUrl && <audio controls preload="none" src={v.previewUrl} className="h-9 max-w-56" />}
                <Button size="sm" variant="soft" disabled={!!busy} onClick={() => run(`demo-${v.voiceId}`, async () => { const j = await call<{ candidate: Candidate }>({ action: "demo_library", voiceId: v.voiceId, name: v.name }); setCandidates((c) => [j.candidate, ...c.filter((x) => x.id !== j.candidate.id)]); setMsg({ ok: true, text: `Demo „${v.name}” gotowe — znajdziesz je na liście kandydatów.` }); })}>
                  {busy === `demo-${v.voiceId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />} Demo po polsku
                </Button>
              </li>
            ))}
            {library.length === 0 && <li className="py-3 text-sm text-muted">Brak głosów na koncie.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
