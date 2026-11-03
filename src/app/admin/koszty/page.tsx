import { costMetrics } from "@/lib/services/metrics";
import { pct, Stat, usd } from "@/components/admin/Stat";

export default async function AdminCosts() {
  const c = await costMetrics();
  const budgetUsed = c.budgetMonthlyUsd > 0 ? c.spentMonthUsd / c.budgetMonthlyUsd : null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Monitoring kosztów AI</h1>
      <p className="text-muted">Koszty rzeczywiste (z logów wywołań) oraz szacunki wg cennika — szacunki działają także w trybie demo, gdzie dostawcy są mockowani.</p>

      <section>
        <h2 className="text-lg font-semibold">Budżet miesięczny</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Limit" value={c.budgetMonthlyUsd > 0 ? usd(c.budgetMonthlyUsd) : "brak (płatne wywołania zablokowane)"} />
          <Stat label="Wydano w tym miesiącu" value={usd(c.spentMonthUsd)} hint={budgetUsed !== null ? `${pct(budgetUsed)} limitu` : undefined} />
          <Stat label="Cache hit rate (TTS)" value={pct(c.cacheHitRate)} />
          <Stat label="Segmenty w cache" value={c.cacheEntries} hint={`wspólne: ${c.sharedEntries}`} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Koszt rzeczywisty wg dostawcy (miesiąc)</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="ElevenLabs TTS" value={usd(c.byProvider.elevenlabsTts)} />
          <Stat label="ElevenLabs Scribe Realtime" value={usd(c.byProvider.elevenlabsStt)} />
          <Stat label="OpenAI tekst" value={usd(c.byProvider.openaiText)} />
          <Stat label="OpenAI ilustracje" value={usd(c.byProvider.openaiImage)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Ekonomika (szacunek wg cennika)</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Znaki TTS (miesiąc)" value={c.listPrice.ttsCharsMonth.toLocaleString("pl-PL")} hint={usd(c.listPrice.ttsUsdMonth)} />
          <Stat label="Sekundy STT (miesiąc)" value={c.listPrice.sttSecondsMonth.toFixed(0)} hint={usd(c.listPrice.sttUsdMonth)} />
          <Stat label="Koszt wspólnego CORE (łącznie)" value={usd(c.listPrice.coreUsdTotal)} hint="generowany raz dla wszystkich" />
          <Stat label="Koszt personalizacji (łącznie)" value={usd(c.listPrice.personalizationUsdTotal)} hint={`${usd(c.listPrice.personalizationUsdPerFamily)} / rodzinę`} />
          <Stat label="Pierwsza bajka nowej rodziny" value={usd(c.listPrice.firstStoryForNewFamilyUsd)} />
          <Stat label="Pierwsze powitanie" value={usd(c.listPrice.firstGreetingUsd)} />
          <Stat label="Kolejne odsłuchy" value={usd(c.listPrice.repeatListenUsd)} hint="gotowy plik z cache" />
          <Stat label="STT / udane powitanie" value={usd(c.listPrice.sttPerSuccessfulGreetingUsd)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Wg celu</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(c.byPurpose).map(([k, v]) => <Stat key={k} label={k} value={usd(v)} />)}
        </div>
      </section>
    </div>
  );
}
