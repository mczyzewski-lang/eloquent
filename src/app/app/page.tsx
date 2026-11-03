import Link from "next/link";
import { BookHeart, CalendarDays, Clock, Headphones, Heart, Library, Lock, Play, Sparkles as SparklesIcon, TrendingUp } from "lucide-react";
import { requireFamily } from "@/lib/auth/guards";
import { getFamilyLibrary } from "@/lib/services/access";
import { getProgressMap } from "@/lib/services/progress";
import { calendarCells, localParts } from "@/lib/domain/unlock";
import { addressForm } from "@/lib/domain/names";
import { STORY_ROADMAP } from "@/content/stories";
import { SiteHeader } from "@/components/site/Header";
import { StoryCover } from "@/components/elofik/StoryCover";
import { Elofik } from "@/components/elofik/Elofik";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { cn, minutesLabel } from "@/lib/utils";
import { getCoverMap } from "@/lib/services/illustrations";

export const metadata = { title: "Bajki", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "dzisiaj", label: "Dzisiaj", icon: SparklesIcon },
  { id: "bajki", label: "Moje bajki", icon: Library },
  { id: "slowa", label: "Poznane słowa", icon: BookHeart },
  { id: "ulubione", label: "Ulubione", icon: Heart },
  { id: "postep", label: "Mój postęp", icon: TrendingUp },
] as const;

function greetingByHour(h: number) {
  if (h < 5) return "Dobranoc";
  if (h < 18) return "Dzień dobry";
  return "Dobry wieczór";
}

function formatUnlock(d: Date, tz: string) {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ tab?: string; subskrypcja?: string; witaj?: string; zablokowana?: string }> }) {
  const sp = await searchParams;
  const { bundle } = await requireFamily("/app");
  const lib = await getFamilyLibrary(bundle.family);
  const progress = await getProgressMap(bundle.family.id);
  const covers = await getCoverMap();
  const forms = bundle.childForms!;
  const tab = TABS.some((t) => t.id === sp.tab) ? sp.tab! : "dzisiaj";
  const hour = localParts(new Date(), bundle.family.timezone).hour;
  const vocative = addressForm(forms, "full");
  const today = lib.today;
  const cells = calendarCells(lib.unlock, 30);
  const listened = [...progress.values()].filter((p) => p.play_count > 0);
  const completed = listened.filter((p) => p.completed);
  const lastPlayed = [...listened].sort((a, b) => (b.last_played_at ?? "").localeCompare(a.last_played_at ?? ""))[0];
  const lastStory = lastPlayed && lib.stories.find((s) => s.storyId === lastPlayed.story_id);
  const tomorrowTitle = lib.tomorrow?.title ?? STORY_ROADMAP.find((r) => r.day === lib.unlock.todayDay + 1)?.title;

  return (
    <div className="paper min-h-dvh pb-24">
      <PageView event="calendar_viewed" />
      <SiteHeader variant="app" />
      <main className="container-page max-w-3xl py-6">
        {sp.subskrypcja === "ok" && <p className="mb-4 rounded-2xl bg-sage/20 p-4 font-semibold text-sage-deep">Dziękujemy! Abonament jest aktywny — kolejne bajki będą odblokowywać się codziennie o 6:00.</p>}
        {sp.zablokowana && <p className="mb-4 rounded-2xl bg-peach p-4 font-semibold text-navy">Ta bajka jeszcze śpi. Obudzi się o 6:00 rano w dniu odblokowania.</p>}

        <div className="flex items-center gap-4">
          <div className="w-16 flex-none sm:w-20"><Elofik mood={sp.witaj ? "waving" : "idle"} /></div>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {greetingByHour(hour)}, {vocative}! Elofik czeka z nową przygodą!
          </h1>
        </div>

        <nav className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2" aria-label="Biblioteka">
          {TABS.map((t) => (
            <Link key={t.id} href={`/app?tab=${t.id}`} className={cn("inline-flex flex-none items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition", tab === t.id ? "bg-navy text-cream" : "bg-white text-navy shadow-sm")} aria-current={tab === t.id ? "page" : undefined}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          ))}
        </nav>

        {tab === "dzisiaj" && (
          <div className="mt-4 space-y-6">
            {today ? (
              <Link href={`/app/bajka/${today.storyId}`} className="card-soft group block overflow-hidden p-0 transition hover:-translate-y-0.5" data-testid="today-card">
                <StoryCover day={today.dayNumber} word={today.wordOfDay} childName={forms.nominative} imageUrl={covers[today.storyId]} className="aspect-[16/10] rounded-none" />
                <div className="flex items-center gap-4 p-5">
                  <div className="flex-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-gold-deep">Dzień {today.dayNumber} — {today.wordOfDay}</p>
                    <h2 className="mt-1 text-2xl font-semibold leading-tight">„{today.title}”</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Clock className="h-4 w-4" /> Czas: {minutesLabel(today.estimatedMinutes)}</p>
                  </div>
                  <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-gold text-navy shadow-soft transition group-hover:scale-105">
                    <Play className="ml-1 h-8 w-8" />
                  </span>
                </div>
              </Link>
            ) : (
              <Card>Brak opublikowanych bajek.</Card>
            )}

            {!lib.access.hasAccess && (
              <Card className="border-2 border-gold bg-gold/10">
                <p className="font-display text-xl font-semibold text-navy">Kolejne przygody czekają!</p>
                <p className="mt-1 text-muted">Pierwsza bajka jest prezentem od Elofika. Z abonamentem Premium każdego dnia odblokuje się nowa przygoda i nowe słowo.</p>
                <Link href="/subskrypcja" className={cn(buttonVariants({ size: "md" }), "mt-4")}>Odblokuj codzienne bajki — 39,90 zł/mies.</Link>
              </Card>
            )}

            <section aria-labelledby="cal">
              <div className="flex items-end justify-between">
                <h2 id="cal" className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-gold-deep" /> Kalendarz przygód</h2>
                {lib.unlock.nextUnlockAt && <p className="text-right text-sm text-muted">Następna: {formatUnlock(lib.unlock.nextUnlockAt, bundle.family.timezone)}</p>}
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-10">
                {cells.map((c) => {
                  const s = lib.unlocked.find((x) => x.dayNumber === c.day);
                  const p = s && progress.get(s.storyId);
                  const inner = (
                    <div
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm font-bold transition",
                        c.state === "today" && "bg-gold text-navy shadow-[var(--shadow-glow)]",
                        c.state === "unlocked" && "bg-white text-navy shadow-sm hover:bg-peach",
                        c.state === "locked" && "bg-navy/5 text-muted",
                      )}
                    >
                      {c.state === "locked" ? <Lock className="h-4 w-4 opacity-60" aria-label="Zablokowane" /> : c.day}
                      {p?.completed && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sage-deep" aria-label="Wysłuchana" />}
                    </div>
                  );
                  return s ? (
                    <Link key={c.day} href={`/app/bajka/${s.storyId}`} aria-label={`Dzień ${c.day}: ${s.title}`}>{inner}</Link>
                  ) : (
                    <div key={c.day} aria-label={`Dzień ${c.day} — zablokowany`}>{inner}</div>
                  );
                })}
              </div>
            </section>

            {tomorrowTitle && (
              <Card className="flex items-center gap-4 bg-navy text-cream">
                <Lock className="h-8 w-8 flex-none text-gold" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-gold">Jutro</p>
                  <p className="font-display text-lg font-semibold text-cream">{tomorrowTitle}</p>
                  <p className="text-sm text-cream/70">{lib.access.hasAccess ? "Elofik już przygotowuje tę przygodę. Obudzi się o 6:00." : "Dostępne z abonamentem Premium."}</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === "bajki" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[...lib.unlocked].reverse().map((s) => (
              <StoryTile key={s.storyId} s={s} p={progress.get(s.storyId)} childName={forms.nominative} coverUrl={covers[s.storyId]} />
            ))}
          </div>
        )}

        {tab === "slowa" && (
          <div className="mt-4 space-y-3">
            <p className="text-muted">Słowa z wysłuchanych bajek. Odsłuchanie to pierwszy krok — oznaczaj słowa, o których rozmawialiście.</p>
            {lib.unlocked.filter((s) => progress.get(s.storyId)?.play_count).length === 0 && <Card>Tu pojawią się słowa z wysłuchanych bajek.</Card>}
            {lib.unlocked
              .filter((s) => progress.get(s.storyId)?.play_count)
              .map((s) => {
                const p = progress.get(s.storyId)!;
                return (
                  <Card key={s.storyId} className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="font-display text-xl font-semibold capitalize text-navy">{s.wordOfDay}</p>
                      <p className="mt-1 text-muted">{s.wordDefinition}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={p.completed ? "sage" : "muted"}>{p.completed ? "wysłuchana" : "w trakcie"}</Badge>
                      {p.word_discussed && <Badge tone="gold">rozmawialiśmy</Badge>}
                    </div>
                  </Card>
                );
              })}
          </div>
        )}

        {tab === "ulubione" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {lib.unlocked.filter((s) => progress.get(s.storyId)?.favorite).length === 0 && <Card>Dotknij serduszka w odtwarzaczu, aby dodać bajkę do ulubionych.</Card>}
            {lib.unlocked
              .filter((s) => progress.get(s.storyId)?.favorite)
              .map((s) => (
                <StoryTile key={s.storyId} s={s} p={progress.get(s.storyId)} childName={forms.nominative} coverUrl={covers[s.storyId]} />
              ))}
          </div>
        )}

        {tab === "postep" && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center"><p className="font-display text-4xl font-semibold text-navy">{listened.length}</p><p className="text-sm text-muted">odsłuchanych bajek</p></Card>
              <Card className="text-center"><p className="font-display text-4xl font-semibold text-navy">{completed.length}</p><p className="text-sm text-muted">poznanych słów</p></Card>
            </div>
            {lastStory && (
              <Card>
                <p className="text-sm font-bold uppercase tracking-wide text-muted">Ostatnio słuchane</p>
                <p className="mt-1 font-display text-lg font-semibold">{lastStory.title}</p>
              </Card>
            )}
            <Card>
              <p className="text-sm font-bold uppercase tracking-wide text-muted">Historia aktywności</p>
              <ul className="mt-3 space-y-2">
                {[...listened]
                  .sort((a, b) => (b.last_played_at ?? "").localeCompare(a.last_played_at ?? ""))
                  .slice(0, 15)
                  .map((p) => {
                    const s = lib.stories.find((x) => x.storyId === p.story_id);
                    return (
                      <li key={p.id} className="flex justify-between gap-2 text-sm">
                        <span>Dzień {s?.dayNumber} · {s?.wordOfDay}</span>
                        <span className="text-muted">{p.last_played_at ? new Date(p.last_played_at).toLocaleDateString("pl-PL") : ""} · {p.play_count}×</span>
                      </li>
                    );
                  })}
                {listened.length === 0 && <li className="text-muted">Jeszcze nic — czas na pierwszą przygodę!</li>}
              </ul>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function StoryTile({ s, p, childName, coverUrl }: { coverUrl?: string; s: { storyId: string; dayNumber: number; title: string; wordOfDay: string; estimatedMinutes: number }; p?: { completed: boolean; favorite: boolean }; childName: string }) {
  return (
    <Link href={`/app/bajka/${s.storyId}`} className="card-soft block overflow-hidden p-0">
      <StoryCover day={s.dayNumber} word={s.wordOfDay} childName={childName} imageUrl={coverUrl} className="aspect-[16/10] rounded-none" />
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gold-deep">Dzień {s.dayNumber} · {s.estimatedMinutes} min {p?.completed ? "· ✓" : ""}</p>
        <p className="mt-1 font-display text-lg font-semibold leading-tight text-navy">{s.title}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-muted"><Headphones className="h-4 w-4" /> Słuchaj</p>
      </div>
    </Link>
  );
}
