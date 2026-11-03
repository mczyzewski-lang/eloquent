import { getDb } from "@/lib/db";
import { getGreetingBank } from "@/lib/services/greetings";
import { getNameForms } from "@/lib/domain/names";
import { config } from "@/lib/config";
import { PRONUNCIATION_VERSION } from "@/lib/domain/pronunciation";
import { GreetingsAdmin } from "@/components/admin/GreetingsAdmin";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export default async function AdminGreetings() {
  await ensureRuntimeSettings();
  const db = getDb();
  const [bank, cache, children] = await Promise.all([getGreetingBank(), db.find("greeting_audio_cache"), db.find("child_profiles")]);
  const byVoice = cache.reduce<Record<string, number>>((acc, c) => ((acc[c.voice_version] = (acc[c.voice_version] ?? 0) + 1), acc), {});
  // Analiza wymowy/odmiany: imiona spoza słownika i bez form potwierdzonych przez rodzica
  const unknownNames = [...new Set(children.filter((c) => !getNameForms(c.name).known && !c.vocative_override).map((c) => c.name))].slice(0, 50);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Powitania Elofika</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase text-muted">Wersja głosu</p><p className="font-display text-xl font-semibold">{config.elevenlabs.voiceVersion}</p><p className="text-xs text-muted">voice: {config.elevenlabs.voiceId || "mock"} · {config.elevenlabs.ttsModel}</p></div>
        <div className="rounded-2xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase text-muted">Warianty</p><p className="font-display text-xl font-semibold">{bank.length}</p></div>
        <div className="rounded-2xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase text-muted">Nagrania w cache</p><p className="font-display text-xl font-semibold">{cache.length}</p><p className="text-xs text-muted">{Object.entries(byVoice).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</p></div>
        <div className="rounded-2xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase text-muted">Słownik wymowy</p><p className="font-display text-xl font-semibold">{PRONUNCIATION_VERSION}</p></div>
      </div>
      <GreetingsAdmin bank={bank} cacheCounts={Object.fromEntries(bank.map((g) => [`${g.id}:${g.locale}`, cache.filter((c) => c.variant_id === g.id && c.locale === g.locale).length]))} unknownNames={unknownNames} />
    </div>
  );
}
