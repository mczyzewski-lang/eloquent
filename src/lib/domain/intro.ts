/**
 * Powitanie na początku każdej bajki: „Czeeeeść, Leonku! Super, że znowu się spotykamy w ten sobotni poranek!”.
 * Część z imieniem jest nagrywana raz na imię (i głos), zdanie o dniu i porze — raz dla wszystkich dzieci
 * (7 dni × kilka pór × pierwsze spotkanie/powrót), więc koszt TTS na nową rodzinę to kilka sylab.
 */
import { localParts } from "./unlock";

export const INTRO_TEMPLATE_VERSION = "INTRO_V1";

type Daypart = { noun: string; neuter: boolean };

const WEEKDAY_M = ["niedzielny", "poniedziałkowy", "wtorkowy", "środowy", "czwartkowy", "piątkowy", "sobotni"];
const WEEKDAY_N = ["niedzielne", "poniedziałkowe", "wtorkowe", "środowe", "czwartkowe", "piątkowe", "sobotnie"];

export function daypartFor(hour: number): Daypart {
  if (hour >= 4 && hour < 10) return { noun: "poranek", neuter: false };
  if (hour >= 10 && hour < 12) return { noun: "przedpołudnie", neuter: true };
  if (hour >= 12 && hour < 17) return { noun: "popołudnie", neuter: true };
  return { noun: "wieczór", neuter: false };
}

/** „w ten sobotni poranek” / „w to niedzielne popołudnie” / „w ten weekendowy wieczór”. */
export function whenPhrase(date: Date, timezone: string): string {
  const { hour, year, month, day } = localParts(date, timezone);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const part = daypartFor(hour);
  // sobotni wieczór brzmi jak wyjście — dla dzieci „weekendowy wieczór” jest cieplejsze
  if (weekday === 6 && part.noun === "wieczór") return "w ten weekendowy wieczór";
  return part.neuter ? `w to ${WEEKDAY_N[weekday]} ${part.noun}` : `w ten ${WEEKDAY_M[weekday]} ${part.noun}`;
}

export interface StoryIntro {
  /** Nagrywane osobno dla imienia (zwrot do dziecka). */
  personal: string;
  /** Wspólne dla wszystkich dzieci — zależy tylko od dnia i pory. */
  shared: string;
}

export function storyIntro(address: string, date: Date, timezone: string, firstMeeting: boolean): StoryIntro {
  const when = whenPhrase(date, timezone);
  return {
    personal: `Czeeeeść, ${address}!`,
    shared: firstMeeting ? `Super, że się poznajemy ${when}! Usiądź wygodnie — zaczynamy naszą pierwszą przygodę.` : `Super, że znowu się spotykamy ${when}! Usiądź wygodnie — zaczynamy.`,
  };
}
