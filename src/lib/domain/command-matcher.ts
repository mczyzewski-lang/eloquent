/**
 * Rozpoznawanie komendy „Hej Elofik!” w transkrypcji Scribe.
 * Tolerancyjne wobec dziecięcej wymowy i drobnych błędów transkrypcji,
 * ale odrzuca hałas, same powitania i niezwiązane wypowiedzi.
 */

export type Locale = "pl" | "en" | "es" | "de" | "fr";

interface LocaleCommand {
  greetings: string[];
  /** Formy imienia bohatera, które uznajemy za poprawne (po normalizacji, bez znaków diakrytycznych). */
  heroForms: string[];
}

const COMMANDS: Record<Locale, LocaleCommand> = {
  pl: {
    greetings: ["hej", "hejka", "hejo", "hey", "czesc", "halo", "hallo", "witaj", "elo", "siema", "dzien dobry", "hello", "hi"],
    heroForms: ["elofik", "elofiku", "elofika", "eloficzku", "eloficzek"],
  },
  en: { greetings: ["hey", "hi", "hello", "hiya", "heya", "yo"], heroForms: ["elofik", "elofick", "elofic"] },
  es: { greetings: ["hola", "oye", "ey", "hey", "buenos dias"], heroForms: ["elofik", "elofic"] },
  de: { greetings: ["hallo", "hey", "hi", "servus", "moin"], heroForms: ["elofik"] },
  fr: { greetings: ["salut", "bonjour", "coucou", "hey", "he"], heroForms: ["elofik", "elofique"] },
};

/** Lowercase, usunięcie diakrytyków i interpunkcji, normalizacja spacji. */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Uproszczenia fonetyczne typowe dla dziecięcej wymowy i błędów ASR. */
function phonetic(token: string): string {
  return token
    .replace(/^h(?=e)/, "") // „helofik” → „elofik”
    .replace(/w/g, "f") // „elowik”
    .replace(/ph/g, "f")
    .replace(/ck|c|q|g/g, "k") // „elofic”, „elofig”
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1"); // „ellofik”
}

export interface MatchResult {
  matched: boolean;
  /** 0..1 — pewność dopasowania */
  confidence: number;
  reason: "exact" | "fuzzy" | "hero_only" | "no_hero" | "empty" | "too_long";
  normalized: string;
}

const MAX_TOKENS = 8;

export function matchGreetingCommand(transcript: string, locale: Locale = "pl"): MatchResult {
  const normalized = normalizeTranscript(transcript ?? "");
  if (!normalized) return { matched: false, confidence: 0, reason: "empty", normalized };
  const tokens = normalized.split(" ");
  // dłuższa wypowiedź to najpewniej rozmowa w tle, nie przywołanie
  if (tokens.length > MAX_TOKENS) return { matched: false, confidence: 0, reason: "too_long", normalized };

  const cmd = COMMANDS[locale] ?? COMMANDS.pl;
  const greetingSet = new Set(cmd.greetings.flatMap((g) => g.split(" ")));
  const heroPhon = [...new Set(cmd.heroForms.map(phonetic))];

  // kandydaci: pojedyncze tokeny, sklejone pary („elo fik”) oraz tokeny bez przyklejonego powitania („hejelofik”)
  const candidates = new Set<string>();
  tokens.forEach((t, i) => {
    candidates.add(t);
    if (i + 1 < tokens.length) candidates.add(t + tokens[i + 1]);
    for (const g of greetingSet) if (t.startsWith(g) && t.length > g.length + 3) candidates.add(t.slice(g.length));
  });

  let best = Infinity;
  let exact = false;
  for (const c of candidates) {
    if (c.length < 4 || c.length > 12) continue;
    if (cmd.heroForms.includes(c)) {
      exact = true;
      best = 0;
      break;
    }
    const p = phonetic(c);
    for (const h of heroPhon) {
      const d = levenshtein(p, h);
      // ostrożny próg: maks. 2 edycje, ale nie więcej niż 1/3 długości wzorca
      const limit = Math.min(2, Math.floor(h.length / 3));
      if (d <= limit && d < best && p[0] === h[0]) best = d;
      if (d <= limit && p[0] !== h[0] && d <= 1 && d < best) best = d; // np. „olofik”
    }
  }

  const hasGreeting = tokens.some((t) => greetingSet.has(t)) || cmd.greetings.some((g) => g.includes(" ") && normalized.includes(g));
  if (best === Infinity) return { matched: false, confidence: 0, reason: "no_hero", normalized };

  const base = exact ? 1 : best === 1 ? 0.8 : 0.6;
  const confidence = Math.min(1, base + (hasGreeting ? 0.15 : 0) - (tokens.length > 4 ? 0.1 : 0));
  const matched = confidence >= 0.6;
  return { matched, confidence, reason: exact ? (hasGreeting ? "exact" : "hero_only") : "fuzzy", normalized };
}

export const GREETING_PROMPT: Record<Locale, string> = {
  pl: "Hej Elofik!",
  en: "Hey Elofik!",
  es: "¡Hola, Elofik!",
  de: "Hallo Elofik!",
  fr: "Salut Elofik !",
};

/** Słowa kluczowe przekazywane do Scribe (keyterms) — poprawiają rozpoznanie imienia bohatera. */
export function scribeKeyterms(locale: Locale): string[] {
  return ["Elofik", "Elofiku", GREETING_PROMPT[locale].replace(/[!¡]/g, "")].slice(0, 50);
}
