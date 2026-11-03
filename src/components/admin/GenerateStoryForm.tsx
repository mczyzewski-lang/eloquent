"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function GenerateStoryForm({ defaultDay, defaultWord, defaultTheme }: { defaultDay: number; defaultWord: string; defaultTheme: string }) {
  const router = useRouter();
  const [day, setDay] = useState(defaultDay);
  const [word, setWord] = useState(defaultWord);
  const [theme, setTheme] = useState(defaultTheme);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/stories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "generate", dayNumber: day, word, theme }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error);
    router.push(`/admin/bajki/${j.story.storyId}`);
  }

  return (
    <form onSubmit={go} className="grid gap-3 rounded-2xl border border-navy/10 bg-white p-4 sm:grid-cols-[100px_1fr_2fr_auto] sm:items-end">
      <div><Label htmlFor="d">Dzień</Label><Input id="d" type="number" min={1} value={day} onChange={(e) => setDay(Number(e.target.value))} /></div>
      <div><Label htmlFor="w">Słowo dnia</Label><Input id="w" value={word} onChange={(e) => setWord(e.target.value)} required /></div>
      <div><Label htmlFor="t">Temat / pomysł</Label><Input id="t" value={theme} onChange={(e) => setTheme(e.target.value)} /></div>
      <Button type="submit" disabled={busy} className="h-14">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} Generuj scenariusz</Button>
      {err && <p className="text-sm text-red-600 sm:col-span-4">{err}</p>}
    </form>
  );
}
