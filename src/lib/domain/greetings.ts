/**
 * Bank powitań Elofika. Każde powitanie (imię + wariant + wersja głosu) jest generowane raz
 * i wykorzystywane ponownie: np. LEON + RETURNING_GREETING_03 + VOICE_V1.
 * Teksty są ciepłe i nigdy nie zawstydzają dziecka za przerwę.
 */
import type { Locale } from "./command-matcher";
import { nameCacheKey } from "./names";

export type GreetingKind = "FIRST_MEETING" | "RETURNING_NEXT_DAY" | "RETURNING_SAME_DAY" | "RETURNING_AFTER_BREAK";

export interface GreetingVariant {
  id: string; // np. RETURNING_GREETING_03
  kind: GreetingKind;
  locale: Locale;
  template: string;
}

export const GREETING_TEMPLATE_VERSION = "GREET_V1";

export const GREETINGS: GreetingVariant[] = [
  // Pierwsze spotkanie
  { id: "FIRST_GREETING_01", kind: "FIRST_MEETING", locale: "pl", template: "Heeej, {child}! Ale super, że się poznajemy! Jestem Elofik i przygotowałem dla Ciebie naprawdę wyjątkową historię. Chodź ze mną!" },
  { id: "FIRST_GREETING_02", kind: "FIRST_MEETING", locale: "pl", template: "Hej, hej, {child}! Tu Elofik, mały elf opowieści! Moje wielkie uszy aż zadrżały z radości, kiedy Cię usłyszałem. Zaczynamy naszą pierwszą przygodę!" },
  { id: "FIRST_GREETING_03", kind: "FIRST_MEETING", locale: "pl", template: "Ojej, {child}! To naprawdę Ty? Jestem Elofik! W mojej torbie na słowa czeka już coś specjalnego. {g:Gotowy|Gotowa|Gotowi do drogi}? Ruszamy!" },
  // Kolejny dzień
  { id: "RETURNING_GREETING_01", kind: "RETURNING_NEXT_DAY", locale: "pl", template: "Heeej, {child}! Ale się cieszę, że znowu jesteś! Właśnie na Ciebie czekałem! Mam dzisiaj dla Ciebie niesamowitą przygodę. {g:Gotowy|Gotowa|Gotowi}? To zaczynamy!" },
  { id: "RETURNING_GREETING_02", kind: "RETURNING_NEXT_DAY", locale: "pl", template: "Ooo, {child}! Jak dobrze Cię znowu słyszeć! Wczoraj było niesamowicie, ale dzisiaj odkryjemy coś jeszcze ciekawszego!" },
  { id: "RETURNING_GREETING_03", kind: "RETURNING_NEXT_DAY", locale: "pl", template: "Hej, {child}! Moje uszy od razu Cię poznały! Dziś w torbie na słowa schowałem zupełnie nowe słowo. Zajrzymy razem?" },
  { id: "RETURNING_GREETING_04", kind: "RETURNING_NEXT_DAY", locale: "pl", template: "Witaj, {child}! Jak miło, że jesteś! Zaczarowany las już szumi, bo wie, że zaczynamy nową historię. Chodźmy!" },
  { id: "RETURNING_GREETING_05", kind: "RETURNING_NEXT_DAY", locale: "pl", template: "Hura! {child}, to Ty! Dzisiaj czeka na nas przygoda pełna zagadek. Usiądź wygodnie i słuchaj uważnie!" },
  // Ten sam dzień (powtórne słuchanie)
  { id: "SAMEDAY_GREETING_01", kind: "RETURNING_SAME_DAY", locale: "pl", template: "O, {child}, znowu się widzimy! Chcesz jeszcze raz posłuchać naszej historii? Świetny pomysł!" },
  { id: "SAMEDAY_GREETING_02", kind: "RETURNING_SAME_DAY", locale: "pl", template: "Hej, {child}! Ta przygoda jest tak dobra, że warto ją przeżyć jeszcze raz. Zaczynamy!" },
  // Po przerwie — bez wywoływania poczucia winy
  { id: "BREAK_GREETING_01", kind: "RETURNING_AFTER_BREAK", locale: "pl", template: "Heeej, {child}! Ale miło, że jesteś! Mam dla Ciebie nową opowieść. Cieszę się, że możemy znowu przeżyć coś razem!" },
  { id: "BREAK_GREETING_02", kind: "RETURNING_AFTER_BREAK", locale: "pl", template: "Ojej, {child}! Jak fajnie Cię słyszeć! W mojej torbie na słowa uzbierało się kilka nowych przygód. Wybierzmy się na jedną z nich!" },
  { id: "BREAK_GREETING_03", kind: "RETURNING_AFTER_BREAK", locale: "pl", template: "Hej, {child}! Witaj z powrotem w świecie Elofika! Mam dziś dla Ciebie coś naprawdę ciekawego. Chodź ze mną!" },
  // English (przygotowanie pod ekspansję)
  { id: "FIRST_GREETING_01", kind: "FIRST_MEETING", locale: "en", template: "Heeey, {child.name}! I'm so happy we finally meet! I'm Elofik, and I've prepared a very special story just for you. Come with me!" },
  { id: "RETURNING_GREETING_01", kind: "RETURNING_NEXT_DAY", locale: "en", template: "Heeey, {child.name}! You're back! I was waiting for you! Today's adventure is amazing. Ready? Let's go!" },
  { id: "BREAK_GREETING_01", kind: "RETURNING_AFTER_BREAK", locale: "en", template: "Hey, {child.name}! It's so nice to hear you! I have a brand new story for you. Let's go on an adventure together!" },
];

export interface GreetingHistory {
  /** Ile razy rodzina ukończyła powitanie (rozpoznanie lub pominięcie) */
  totalGreetings: number;
  /** Ostatnie słuchanie (dowolnej bajki) */
  lastListenedAt: Date | null;
  now: Date;
  /** Kolejny numer dnia bajki — do deterministycznej rotacji */
  storyDay: number;
}

const DAY = 86_400_000;

export function pickGreetingKind(h: GreetingHistory): GreetingKind {
  if (h.totalGreetings === 0 || !h.lastListenedAt) return "FIRST_MEETING";
  const gap = h.now.getTime() - h.lastListenedAt.getTime();
  if (gap < 10 * 60 * 60 * 1000) return "RETURNING_SAME_DAY";
  if (gap <= 2.5 * DAY) return "RETURNING_NEXT_DAY";
  return "RETURNING_AFTER_BREAK";
}

export function variantsFor(kind: GreetingKind, locale: Locale): GreetingVariant[] {
  const list = GREETINGS.filter((g) => g.kind === kind && g.locale === locale);
  if (list.length) return list;
  return GREETINGS.filter((g) => g.kind === kind && g.locale === "pl");
}

/** Deterministyczny wybór wariantu: rotacja po numerze dnia — przewidywalna, łatwa do prefetchu. */
export function pickGreeting(h: GreetingHistory, locale: Locale): GreetingVariant {
  const kind = pickGreetingKind(h);
  const list = variantsFor(kind, locale);
  return list[(Math.max(1, h.storyDay) - 1) % list.length];
}

/** Czytelny identyfikator assetu: LEON + RETURNING_GREETING_03 + VOICE_V1 */
export function greetingAssetLabel(childName: string, variantId: string, voiceVersion: string): string {
  return `${nameCacheKey(childName).toUpperCase()} + ${variantId} + ${voiceVersion}`;
}
