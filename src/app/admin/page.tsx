import { businessMetrics } from "@/lib/services/metrics";
import { getDb } from "@/lib/db";
import { formatPln } from "@/lib/domain/pricing";
import { Funnel, pct, Stat } from "@/components/admin/Stat";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { config, hasElevenLabs, hasOpenAI } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminDashboard() {
  const m = await businessMetrics();
  const db = getDb();
  const audit = await db.find("admin_audit_logs", {}, { orderBy: { column: "created_at", ascending: false }, limit: 10 });
  const jobs = await db.find("generation_jobs", { status: { in: ["queued", "running", "failed"] } }, { limit: 20 });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Dashboard biznesowy</h1>
      {(!hasElevenLabs() || !hasOpenAI() || config.budget.monthlyUsd <= 0) && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-gold bg-gold/15 p-4" data-testid="api-keys-prompt">
          <KeyRound className="h-8 w-8 flex-none text-gold-deep" />
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-navy">Podaj klucze API, aby Elofik zaczął mówić prawdziwym głosem</p>
            <p className="text-sm text-muted">
              Brakuje: {[!config.elevenlabs.apiKey && "klucza ElevenLabs", !config.elevenlabs.voiceId && "Voice ID głosu Elofika", !hasOpenAI() && "klucza OpenAI", config.budget.monthlyUsd <= 0 && "miesięcznego budżetu AI"].filter(Boolean).join(", ")}. Do tego czasu głos, rozpoznawanie mowy i generator działają w trybie zastępczym.
            </p>
          </div>
          <Link href="/admin/ustawienia" className={buttonVariants({ size: "md" })}>Uzupełnij klucze API</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label="Konta" value={m.accounts} />
        <Stat label="Rodziny" value={m.families} />
        <Stat label="Aktywne dostępy" value={m.activeSubscriptions} hint={`płacące: ${m.payingSubscriptions}`} />
        <Stat label="MRR (brutto)" value={formatPln(m.mrrGross)} />
        <Stat label="Nowe subskrypcje 30 d" value={m.newSubscriptions30d} />
        <Stat label="Anulowania 30 d" value={m.cancellations30d} hint={`churn ${pct(m.churnRate30d)}`} />
        <Stat label="Nieudane płatności 30 d" value={m.paymentFailures30d} />
        <Stat label="Retencja D1 / D7" value={`${pct(m.retention.d1)} / ${pct(m.retention.d7)}`} />
        <Stat label="Retencja D14 / D30" value={`${pct(m.retention.d14)} / ${pct(m.retention.d30)}`} />
        <Stat label="Śr. odsłuchów / rodzinę" value={m.avgPlaysPerFamily.toFixed(1)} />
        <Stat label="Odblokowane → odtworzone" value={pct(m.unlockedPlayedRate)} />
        <Stat label="Ukończone bajki" value={pct(m.completionRate)} />
        <Stat label="Skuteczność rytuału" value={pct(m.voiceRecognitionRate)} hint={`pominięcia: ${m.voiceSkipped}`} />
        <Stat label="Udział prezentów" value={pct(m.giftShare)} hint={`kupione ${m.giftsPurchased}, aktywowane ${m.giftsRedeemed}`} />
        <Stat label="Polecenia" value={m.referralsQualified} hint={`odrzucone: ${m.referralsRejected}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Funnel title="Lejek rodziców" steps={m.funnelParents} />
        <Funnel title="Lejek dziadków" steps={m.funnelGrandparents} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="font-display text-lg font-semibold">Kolejka zadań</p>
          {jobs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Brak oczekujących zadań.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {jobs.map((j) => (
                <li key={j.id}>
                  <strong>{j.type}</strong> · {j.status} · próby {j.attempts}/{j.max_attempts}
                  {j.error ? ` · ${j.error.slice(0, 80)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="font-display text-lg font-semibold">Logi administracyjne</p>
          <ul className="mt-2 space-y-1 text-sm">
            {audit.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString("pl-PL")} · <strong>{a.action}</strong> {a.target}
              </li>
            ))}
          </ul>
          {audit.length === 0 && <p className="mt-2 text-sm text-muted">Brak wpisów.</p>}
        </div>
      </div>
    </div>
  );
}
