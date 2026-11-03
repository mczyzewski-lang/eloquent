/**
 * Codzienne odblokowywanie bajek — liczone WYŁĄCZNIE na serwerze, na podstawie czasu serwera.
 * Dzień 1: od razu po aktywacji. Dzień N: o `unlockHour` czasu lokalnego rodziny,
 * (N-1) dni kalendarzowych po dniu aktywacji. Zmiana daty w telefonie nie ma wpływu.
 */

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function isValidTimezone(tz: string): boolean {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

export function localParts(instant: Date, tz: string): LocalParts {
  const parts = Object.fromEntries(formatter(tz).formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

/** Liczba dni kalendarzowych między dwiema datami lokalnymi (b - a). */
function civilDayNumber(p: Pick<LocalParts, "year" | "month" | "day">): number {
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
}

/** Zamienia lokalny czas „ściany” w strefie tz na instant UTC (obsługuje DST). */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(guess), tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    const diff = target - asUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}

export interface UnlockInput {
  activatedAt: Date;
  now: Date;
  timezone: string;
  unlockHour: number;
  /** Liczba opublikowanych bajek w sekwencji — górny limit. */
  totalStories: number;
  /** Czy rodzina ma aktywny dostęp (abonament / prezent / okres próbny). */
  hasAccess: boolean;
  /** Ile pierwszych dni jest dostępnych bez abonamentu (domyślnie 1 — Dzień 1 po onboardingu). */
  freeDays?: number;
}

export interface UnlockState {
  /** Najwyższy odblokowany numer dnia (0 = brak dostępu). */
  unlockedThrough: number;
  /** Numer „dzisiejszej” bajki (najnowszej odblokowanej). */
  todayDay: number;
  /** Kiedy odblokuje się następna bajka (null, jeśli brak kolejnych / brak dostępu). */
  nextUnlockAt: Date | null;
  nextDay: number | null;
}

export function computeUnlockState(input: UnlockInput): UnlockState {
  const { activatedAt, now, timezone, unlockHour, totalStories, hasAccess, freeDays = 1 } = input;
  if (totalStories <= 0 || now < activatedAt) {
    return { unlockedThrough: 0, todayDay: 0, nextUnlockAt: null, nextDay: null };
  }
  if (!hasAccess) {
    const free = Math.min(freeDays, totalStories);
    return { unlockedThrough: free, todayDay: free, nextUnlockAt: null, nextDay: free < totalStories ? free + 1 : null };
  }
  const a = localParts(activatedAt, timezone);
  const n = localParts(now, timezone);
  let daysElapsed = civilDayNumber(n) - civilDayNumber(a);
  if (n.hour < unlockHour) daysElapsed -= 1; // dzisiejsza bajka jeszcze przed godziną odblokowania
  const unlocked = Math.min(totalStories, 1 + Math.max(0, daysElapsed));

  let nextUnlockAt: Date | null = null;
  let nextDay: number | null = null;
  if (unlocked < totalStories) {
    nextDay = unlocked + 1;
    // dzień N odblokowuje się (N-1) dni po dniu aktywacji o unlockHour
    const base = new Date(Date.UTC(a.year, a.month - 1, a.day + (nextDay - 1)));
    nextUnlockAt = zonedTimeToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), unlockHour, 0, timezone);
    // wyjątek: jeśli aktywacja nastąpiła przed godziną odblokowania tego samego dnia, dzień 2 i tak jest jutro
    if (nextUnlockAt <= now) {
      const tomorrow = new Date(Date.UTC(n.year, n.month - 1, n.day + 1));
      nextUnlockAt = zonedTimeToUtc(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), unlockHour, 0, timezone);
    }
  }
  return { unlockedThrough: unlocked, todayDay: unlocked, nextUnlockAt, nextDay };
}

export function isDayUnlocked(state: UnlockState, dayNumber: number): boolean {
  return dayNumber >= 1 && dayNumber <= state.unlockedThrough;
}

export type CalendarCellState = "unlocked" | "today" | "locked";

export function calendarCells(state: UnlockState, days = 30): { day: number; state: CalendarCellState }[] {
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const s: CalendarCellState = day === state.todayDay ? "today" : day < state.todayDay ? "unlocked" : "locked";
    return { day, state: s };
  });
}
