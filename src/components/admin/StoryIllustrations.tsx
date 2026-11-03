"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SCENE_FIELDS, type ImageType, type SceneSpec } from "@/lib/ai/elofik-bible";
import { IllustrationCard, illustrationsApi, type IllustrationView } from "./IllustrationCard";

/** Ilustracje konkretnej bajki: edycja zmiennej sceny, generowanie okładki / sceny, historia wersji z akceptacją. */
export function StoryIllustrations({ storyId, initialScene, items: initialItems, referenceUrl, costs }: { storyId: string; initialScene: SceneSpec; items: IllustrationView[]; referenceUrl: string | null; costs: Record<"low" | "medium" | "high", number> }) {
  const [scene, setScene] = useState(initialScene);
  const [type, setType] = useState<ImageType>("COVER");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const upsert = (i: IllustrationView) => setItems((l) => [i, ...l.filter((x) => x.id !== i.id)]);

  async function generate(regenerate: boolean) {
    if (!confirm(`Wygenerować ${type === "COVER" ? "okładkę" : "ilustrację sceny"} (${quality}, ok. $${costs[quality].toFixed(2)})?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const j = await illustrationsApi<{ illustration: IllustrationView; cached: boolean }>({ action: "generate", storyId, imageType: type, scene, quality, regenerate });
      upsert(j.illustration);
      setMsg(j.cached ? "Taka ilustracja już istnieje (cache, bez kosztu). Użyj „Wygeneruj nową wersję”, aby powstała kolejna." : "Gotowe — sprawdź checklistę i zatwierdź.");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-navy/10 bg-white p-4">
      <h2 className="text-xl font-semibold">Ilustracje</h2>
      <p className="text-sm text-muted">Opis wyglądu Elofika jest stały (character bible) — tutaj zmieniasz tylko scenę. Na stronie pojawia się wyłącznie zatwierdzona okładka; inaczej działa wektorowa scena zastępcza.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {SCENE_FIELDS.map((f) => (
          <div key={f.key} className={f.key === "action" || f.key === "location" ? "md:col-span-2" : ""}>
            <Label htmlFor={`scene-${f.key}`}>{f.label}</Label>
            <Input id={`scene-${f.key}`} value={scene[f.key]} maxLength={320} onChange={(e) => setScene({ ...scene, [f.key]: e.target.value })} className="h-11 text-sm" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="ill-type">Format</Label>
          <select id="ill-type" value={type} onChange={(e) => setType(e.target.value as ImageType)} className="h-11 rounded-xl border border-navy/10 bg-white px-2">
            <option value="COVER">Okładka (COVER, 3:4)</option>
            <option value="INTERIOR">Scena (INTERIOR, 3:2)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ill-q">Jakość</Label>
          <select id="ill-q" value={quality} onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")} className="h-11 rounded-xl border border-navy/10 bg-white px-2">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <Button onClick={() => generate(false)} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generuj</Button>
      </div>
      {busy && <p className="text-sm text-muted">OpenAI rysuje z referencją Elofika — zwykle 30–120 s…</p>}
      {msg && <p className="rounded-xl bg-navy/5 p-3 text-sm font-semibold">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((i) => (
          <IllustrationCard key={i.id} item={i} referenceUrl={referenceUrl} onChange={upsert} onRegenerate={async () => { const j = await illustrationsApi<{ illustration: IllustrationView }>({ action: "generate", storyId, imageType: i.imageType, scene: i.scene, quality, regenerate: true }); upsert(j.illustration); }} />
        ))}
      </div>
    </div>
  );
}
