import { businessMetrics } from "@/lib/services/metrics";
import { getDb } from "@/lib/db";
import { formatPln } from "@/lib/domain/pricing";
import { Funnel, pct, Stat } from "@/components/admin/Stat";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { config, hasElevenLabs, hasOpenAI } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { landingArtUncached, mascotMapUncached } from "@/lib/services/illustrations";
import { LANDING_SCENES, MASCOT_POSES } from "@/lib/ai/elofik-bible";

export default async function AdminDashboard() {
  const m = await businessMetrics();
  const db = getDb();
  const audit = await db.find("admin_audit_logs", {}, { orderBy: { column: "created_at", ascending: false }, limit: 10 });
  const jobs = await db.find("generation_jobs", { status: { in: ["queued", "running", "failed"] } }, { limit: 20 });
  const [mascots, landingArt, pendingArt] = await Promise.all([
    mascotMapUncached().catch(() => ({}) as Record<string, string>),
    landingArtUncached().catch(() => ({}) as Record<string, string>),
    db.count("illustrations", { story_id: { in: ["__mascot__", "__landing__"] }, status: "pending" }).catch(() => 0),
  ]);
  const artTotal = Object.keys(MASCOT_POSES).length + LANDING_SCENES.length;
  const artApproved = Object.keys(mascots).length + LANDING_SCENES.filter((x) => landingArt[x.slot]).length;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Dashboard biznesowy</h1>
      {(!hasElevenLabs() || !hasOpenAI() || config.budget.monthlyUsd <= 0 || !config.sms.smsapiToken) && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/50 bg-gold/10 p-4" data-testid="api-keys-prompt">
          <KeyRound className="h-8 w-8 flex-none text-gold-deep" />
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-navy">Podaj klucze API, aby Elofik zaczął mówić prawdziwym głosem</p>
            <p className="text-sm text-muted">
              Brakuje: {[!config.elevenlabs.apiKey && "klucza ElevenLabs", !config.elevenlabs.voiceId && "Voice ID głosu Elofika", !hasOpenAI() && "klucza OpenAI", config.budget.monthlyUsd <= 0 && "miesięcznego budżetu AI", !config.sms.smsapiToken && "tokenu SMSAPI (bez niego kody SMS przy zakładaniu konta są pokazywane na ekranie — tryb testowy)"].filter(Boolean).join(", ")}. Do tego czasu głos, rozpoznawanie mowy i generator działają w trybie zastępczym.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ustawienia" data-ui="button" data-variant="primary" data-size="md" className={buttonVariants({ size: "md" })}>Uzupełnij klucze API</Link>
            {config.elevenlabs.apiKey && !config.elevenlabs.voiceId && <Link href="/admin/glos" data-ui="button" data-variant="soft" data-size="md" className={buttonVariants({ size: "md", variant: "soft" })}>Wybierz głos Elofika</Link>}
          </div>
        </div>
      )}
      {artApproved < artTotal && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/50 bg-gold/10 p-4" data-testid="site-art-prompt">
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-navy">Grafiki Elofika na stronie: zatwierdzone {artApproved} z {artTotal}</p>
            <p className="text-sm text-muted">
              {pendingArt > 0
                ? `${pendingArt} czeka na Twoją akceptację — dopóki ich nie zatwierdzisz, strona pokazuje tymczasowo Elofika z logo.`
                : "Do czasu wygenerowania i zatwierdzenia grafik z OpenAI strona pokazuje tymczasowo Elofika z logo."}
            </p>
          </div>
          <Link href="/admin/ilustracje" data-ui="button" data-variant="primary" data-size="md" className={buttonVariants({ size: "md" })}>{pendingArt > 0 ? "Przejrzyj i zatwierdź" : "Wygeneruj grafiki"}</Link>
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
