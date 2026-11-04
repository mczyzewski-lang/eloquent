import Link from "next/link";
import { CalendarDays, Check, Clock, Headphones, Heart, Lock, Play, Wand2 } from "lucide-react";
import { requireFamily } from "@/lib/auth/guards";
import { getFamilyLibrary } from "@/lib/services/access";
import { getProgressMap } from "@/lib/services/progress";
import { calendarCells, localParts } from "@/lib/domain/unlock";
import { addressForm } from "@/lib/domain/names";
import { STORY_ROADMAP } from "@/content/stories";
import { StoryCover } from "@/components/elofik/StoryCover";
import { Elofik } from "@/components/elofik/Elofik";
import { Badge, Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageView } from "@/components/site/PageView";
import { AppShell, type AppTab } from "@/components/app/AppShell";
import { HScroll } from "@/components/app/HScroll";
import { cn, minutesLabel } from "@/lib/utils";
import { getCoverMap } from "@/lib/services/illustrations";
import { hasSecretStory, referralSummary } from "@/lib/services/referrals";
import { SECRET_STORY } from "@/content/secret-story";

export const metadata = { title: "Bajki", robots: { index: false } };
export const dynamic = "force-dynamic";

const TAB_IDS = ["dzisiaj", "bajki", "ulubione", "slowa", "postep"] as const;

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
  const [secretUnlocked, invites] = await Promise.all([hasSecretStory(bundle.family.id), referralSummary(bundle.family.id)]);
  const forms = bundle.childForms!;
  const tab = (TAB_IDS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TAB_IDS)[number]) : "dzisiaj";
  const navTab: AppTab = tab === "ulubione" ? "bajki" : tab;
  const hour = localParts(new Date(), bundle.family.timezone).hour;
  const vocative = addressForm(forms, "full");
  const today = lib.today;
  const listened = [...progress.values()].filter((p) => p.play_count > 0);
  const completed = listened.filter((p) => p.completed);
  const lastPlayed = [...listened].sort((a, b) => (b.last_played_at ?? "").localeCompare(a.last_played_at ?? ""))[0];
  const lastStory = lastPlayed && lib.stories.find((s) => s.storyId === lastPlayed.story_id);
  const favorites = lib.unlocked.filter((s) => progress.get(s.storyId)?.favorite);

  // kalendarz: 30 dni — dostępne (z okładką), dzisiejsza, zablokowane (z kłódką)
  const calendar = calendarCells(lib.unlock, 30).map((c) => {
    const available = lib.unlocked.find((x) => x.dayNumber === c.day);
    const story = available ?? lib.stories.find((x) => x.dayNumber === c.day);
    const road = STORY_ROADMAP.find((r) => r.day === c.day);
    return {
      day: c.day,
      isToday: c.state === "today",
      available,
      title: story?.title ?? road?.title ?? "Nowa przygoda",
      word: story?.wordOfDay ?? road?.word ?? "",
      cover: story ? covers[story.storyId] : undefined,
      done: available ? Boolean(progress.get(available.storyId)?.completed) : false,
      isTomorrow: c.day === lib.unlock.todayDay + 1,
    };
  });

  // na wierzchu tydzień wokół dzisiejszego dnia, reszta po rozwinięciu
  const startIdx = Math.max(0, Math.min(calendar.length - 7, lib.unlock.todayDay - 3));
  const calendarWindow = calendar.slice(startIdx, startIdx + 7);
  const calendarRest = calendar.filter((c) => !calendarWindow.includes(c));

  return (
    <AppShell active={navTab} title={`Dzień ${lib.unlock.todayDay}`} kids={bundle.children.map((c) => ({ id: c.id, name: c.name }))} activeChildId={bundle.child?.id}>
      <PageView event="calendar_viewed" />
      {sp.subskrypcja === "ok" && <p className="mb-4 rounded-2xl bg-sage/20 p-4 font-semibold text-sage-deep">Dziękujemy! Abonament jest aktywny — kolejne bajki będą odblokowywać się codziennie o 6:00.</p>}
      {sp.zablokowana && <p className="mb-4 rounded-2xl bg-peach p-4 font-semibold text-navy">Ta bajka jeszcze śpi. Obudzi się o 6:00 rano w dniu odblokowania.</p>}

      {tab === "dzisiaj" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Elofik mood={sp.witaj ? "waving" : "idle"} fallback={null} className="w-14 flex-none" />
            <h1 className="text-2xl font-semibold leading-tight">{greetingByHour(hour)}, {vocative}! Elofik czeka z nową przygodą!</h1>
          </div>

          {today ? (
            <Link href={`/app/bajka/${today.storyId}`} className="card-soft group block overflow-hidden p-0 transition active:scale-[0.99]" data-testid="today-card">
              <StoryCover day={today.dayNumber} word={today.wordOfDay} childName={forms.nominative} imageUrl={covers[today.storyId]} className="aspect-[16/10] rounded-none" />
              <div className="flex items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
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

          <section aria-labelledby="cal">
            <div className="flex items-end justify-between gap-3">
              <h2 id="cal" className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-gold-deep" /> Kalendarz przygód</h2>
              {lib.unlock.nextUnlockAt && <p className="text-right text-xs text-muted">Następna: {formatUnlock(lib.unlock.nextUnlockAt, bundle.family.timezone)}</p>}
            </div>
            <ol className="mt-3 space-y-2" aria-label="Kalendarz przygód">
              {calendarWindow.map((c) => <CalendarRow key={c.day} c={c} hasAccess={lib.access.hasAccess} />)}
            </ol>
            {calendarRest.length > 0 && (
              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-2xl py-3 text-sm font-bold text-navy hover:bg-white/60 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Pokaż cały kalendarz ({calendar.length} dni)</span>
                  <span className="hidden group-open:inline">Zwiń kalendarz</span>
                </summary>
                <ol className="mt-1 space-y-2">
                  {calendarRest.map((c) => <CalendarRow key={c.day} c={c} hasAccess={lib.access.hasAccess} />)}
                </ol>
              </details>
            )}
          </section>

          <SecretStoryCard unlocked={secretUnlocked} done={invites.qualified} goal={invites.goal} />
          <CustomStoryCta />

          {!lib.access.hasAccess && (
            <Card className="border-2 border-gold bg-gold/10">
              <p className="font-display text-xl font-semibold text-navy">Kolejne przygody czekają!</p>
              <p className="mt-1 text-muted">Pierwsza bajka jest prezentem od Elofika. Z abonamentem Premium każdego dnia odblokuje się nowa przygoda i nowe słowo.</p>
              <Link href="/subskrypcja" className={cn(buttonVariants({ size: "md" }), "mt-4 w-full sm:w-auto")}>Odblokuj codzienne bajki — 39,90 zł/mies.</Link>
            </Card>
          )}
        </div>
      )}

      {(tab === "bajki" || tab === "ulubione") && (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Moje bajki</h1>
          <CustomStoryCta />
          <SecretStoryCard unlocked={secretUnlocked} done={invites.qualified} goal={invites.goal} />
          {favorites.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Heart className="h-5 w-5 text-peach-deep" /> Ulubione</h2>
              <HScroll className="mt-3" label="Ulubione bajki">
                {favorites.map((s) => (
                  <div key={s.storyId} role="listitem" className="w-40 flex-none snap-start">
                    <StoryTile s={s} p={progress.get(s.storyId)} childName={forms.nominative} coverUrl={covers[s.storyId]} compact />
                  </div>
                ))}
              </HScroll>
            </section>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {[...lib.unlocked].reverse().map((s) => (
              <StoryTile key={s.storyId} s={s} p={progress.get(s.storyId)} childName={forms.nominative} coverUrl={covers[s.storyId]} />
            ))}
          </div>
          {favorites.length === 0 && <p className="text-sm text-muted">Dotknij serduszka w odtwarzaczu, aby dodać bajkę do ulubionych.</p>}
        </div>
      )}

      {tab === "slowa" && (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Poznane słowa</h1>
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

      {tab === "postep" && (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Mój postęp</h1>
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
    </AppShell>
  );
}

function StoryTile({ s, p, childName, coverUrl, compact }: { coverUrl?: string; s: { storyId: string; dayNumber: number; title: string; wordOfDay: string; estimatedMinutes: number }; p?: { completed: boolean; favorite: boolean }; childName: string; compact?: boolean }) {
  return (
    <Link href={`/app/bajka/${s.storyId}`} className="card-soft block overflow-hidden p-0 active:scale-[0.99]">
      <StoryCover day={s.dayNumber} word={compact ? undefined : s.wordOfDay} childName={compact ? undefined : childName} compact={compact} imageUrl={coverUrl} className={cn(compact ? "aspect-[4/5]" : "aspect-[16/10]", "rounded-none")} />
      <div className={compact ? "p-2.5" : "p-4"}>
        <p className="text-xs font-bold uppercase tracking-wide text-gold-deep">Dzień {s.dayNumber} · {s.estimatedMinutes} min {p?.completed ? "· ✓" : ""}</p>
        <p className={cn("mt-1 font-display font-semibold leading-tight text-navy", compact ? "line-clamp-2 text-sm" : "text-lg")}>{s.title}</p>
        {!compact && <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-muted"><Headphones className="h-4 w-4" /> Słuchaj</p>}
      </div>
    </Link>
  );
}

function SecretStoryCard({ unlocked, done, goal }: { unlocked: boolean; done: number; goal: number }) {
  const inner = (
    <div className="night relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-2xl)] p-4 text-cream shadow-soft">
      <span className={cn("flex h-14 w-14 flex-none items-center justify-center rounded-2xl", unlocked ? "bg-gold text-navy" : "bg-white/10 text-gold")}>
        {unlocked ? <Play className="ml-0.5 h-7 w-7" /> : <Lock className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-gold">Sekretna bajka · ok. {SECRET_STORY.estimatedMinutes} min</p>
        <p className="font-display text-lg font-semibold leading-tight text-cream">{SECRET_STORY.title.replace("Sekretna bajka: ", "")}</p>
        <p className="mt-0.5 text-sm text-cream/75">{unlocked ? "Cała rodzina w jednej opowieści. Posłuchajcie razem!" : `Zaproś ${goal} rodziny i odbierz miesiąc gratis + tę bajkę · ${Math.min(done, goal)}/${goal}`}</p>
      </div>
    </div>
  );
  return unlocked ? (
    <Link href={`/app/bajka/${SECRET_STORY.storyId}`} className="block active:scale-[0.99]" data-testid="secret-story">{inner}</Link>
  ) : (
    <Link href="/konto#polecenia" className="block active:scale-[0.99]" data-testid="secret-story-locked">{inner}</Link>
  );
}

type CalendarItem = { day: number; isToday: boolean; available?: { storyId: string }; title: string; word: string; cover?: string; done: boolean; isTomorrow: boolean };

function CalendarRow({ c, hasAccess }: { c: CalendarItem; hasAccess: boolean }) {
  const status = c.isToday ? "Dziś" : c.available ? (c.done ? "wysłuchana" : "do posłuchania") : c.isTomorrow ? (hasAccess ? "jutro o 6:00" : "z Premium") : hasAccess ? "wkrótce" : "z Premium";
  const body = (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-white p-2 pr-3 shadow-sm transition", c.isToday && "ring-2 ring-gold", !c.available && "bg-white/60")}>
      <div className="relative h-16 w-16 flex-none overflow-hidden rounded-xl">
        <StoryCover day={c.day} compact imageUrl={c.cover} className={cn("h-full w-full rounded-none", !c.available && "brightness-[0.6] saturate-50")} />
        {!c.available && <span className="absolute inset-0 flex items-center justify-center" aria-hidden><Lock className="h-5 w-5 text-cream drop-shadow" /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-bold uppercase tracking-wide", c.isToday ? "text-gold-deep" : "text-muted")}>Dzień {c.day} · {status}</p>
        <p className={cn("truncate font-display font-semibold leading-tight", c.available ? "text-navy" : "text-navy/60")}>{c.title}</p>
        {c.word && <p className="truncate text-xs text-muted">słowo: {c.word}</p>}
      </div>
      <span className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-full", c.available ? (c.done ? "bg-sage/20 text-sage-deep" : "bg-gold text-navy") : "bg-navy/5 text-muted")} aria-hidden>
        {!c.available ? <Lock className="h-4 w-4" /> : c.done ? <Check className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </span>
    </div>
  );
  return (
    <li>
      {c.available ? (
        <Link href={`/app/bajka/${c.available.storyId}`} aria-label={`Dzień ${c.day}: ${c.title}`} className="block active:scale-[0.99]">{body}</Link>
      ) : (
        <div aria-label={`Dzień ${c.day}: ${c.title} — zablokowana`}>{body}</div>
      )}
    </li>
  );
}

function CustomStoryCta() {
  return (
    <Link href="/app/wlasna-bajka" className="flex items-center gap-4 rounded-[var(--radius-2xl)] border-2 border-dashed border-gold-deep/50 bg-gold/10 p-4 active:scale-[0.99]" data-testid="custom-story-cta">
      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gold text-navy"><Wand2 className="h-7 w-7" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold leading-tight text-navy">Wymyśl własną bajkę</span>
        <span className="block text-sm text-muted">Opisz pomysł — Elofik ją napisze i przeczyta</span>
      </span>
    </Link>
  );
}
