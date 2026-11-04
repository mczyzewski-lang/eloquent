/**
 * Rutyna słuchania: rodzic wybiera stałą porę dnia. Dzieci najlepiej uczą się w powtarzalnym rytmie,
 * a stała pora pomaga też rodzicowi zbudować nawyk. Pora ustawia godzinę przypomnienia
 * i pozwala przygotować bajkę (z powitaniem „w ten … poranek / wieczór”) przed czasem.
 */
import { localParts, zonedTimeToUtc } from "./unlock";

export const ROUTINES = [
  { id: "wakeup", label: "Po przebudzeniu", hint: "spokojny start dnia", hour: 7, minute: 0, emoji: "🌅" },
  { id: "to_kindergarten", label: "W drodze do przedszkola", hint: "w aucie, w tramwaju, na spacerze", hour: 7, minute: 45, emoji: "🚗" },
  { id: "from_kindergarten", label: "W drodze z przedszkola do domu", hint: "wyciszenie po dniu pełnym wrażeń", hour: 15, minute: 30, emoji: "🏡" },
  { id: "afternoon", label: "Po południu", hint: "chwila odpoczynku", hour: 16, minute: 30, emoji: "☀️" },
  { id: "evening", label: "Wieczorem", hint: "po kolacji, przed kąpielą", hour: 18, minute: 30, emoji: "🌇" },
  { id: "bedtime", label: "Wieczorem przed snem", hint: "w łóżku, przy zgaszonym świetle", hour: 19, minute: 30, emoji: "🌙" },
] as const;

export type RoutineId = (typeof ROUTINES)[number]["id"];
export const ROUTINE_IDS = ROUTINES.map((r) => r.id) as [RoutineId, ...RoutineId[]];

export function routineById(id: string | null | undefined) {
  return ROUTINES.find((r) => r.id === id) ?? null;
}

/** Najbliższy moment rutyny (dziś, jeśli jeszcze przed nami, inaczej jutro) — do przygotowania bajki z wyprzedzeniem. */
export function nextRoutineAt(id: string | null | undefined, timezone: string, now = new Date()): Date | null {
  const r = routineById(id);
  if (!r) return null;
  const p = localParts(now, timezone);
  const today = zonedTimeToUtc(p.year, p.month, p.day, r.hour, r.minute, timezone);
  if (today.getTime() > now.getTime()) return today;
  const t = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return zonedTimeToUtc(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), r.hour, r.minute, timezone);
}
