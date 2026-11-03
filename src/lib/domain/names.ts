/**
 * Bezpieczna obsługa polskich imion.
 *
 * Zasada: odmieniamy WYŁĄCZNIE imiona, które znamy ze słownika albo których formy potwierdził rodzic.
 * Dla nieznanych imion używamy mianownika i konstrukcji, które nie wymagają odmiany
 * („Posłuchaj bajki, w której występuje Kaja”). Dzięki temu nietypowe imiona nigdy nie są
 * kaleczone przez zgadywaną odmianę.
 */

export type GrammaticalGender = "m" | "f" | "n";

export interface NameForms {
  /** Mianownik: Leon */
  nominative: string;
  /** Dopełniacz: (dla) Leona — null, jeśli nieznany */
  genitive: string | null;
  /** Wołacz: Leonie! */
  vocative: string | null;
  /** Zdrobnienie w mianowniku: Leonek */
  diminutive: string | null;
  /** Zdrobnienie w wołaczu: Leonku! */
  diminutiveVocative: string | null;
  gender: GrammaticalGender | null;
  /** Czy formy pochodzą ze słownika / od rodzica (true), czy to bezpieczny fallback (false). */
  known: boolean;
}

// [mianownik, dopełniacz, wołacz, zdrobnienie, wołacz zdrobnienia, rodzaj]
type Row = [string, string, string, string, string, GrammaticalGender];

const DICTIONARY: Row[] = [
  ["Leon", "Leona", "Leonie", "Leonek", "Leonku", "m"],
  ["Antoni", "Antoniego", "Antoni", "Antoś", "Antosiu", "m"],
  ["Jan", "Jana", "Janie", "Janek", "Janku", "m"],
  ["Jaś", "Jasia", "Jasiu", "Jaś", "Jasiu", "m"],
  ["Franciszek", "Franciszka", "Franciszku", "Franek", "Franku", "m"],
  ["Nikodem", "Nikodema", "Nikodemie", "Nikoś", "Nikosiu", "m"],
  ["Ignacy", "Ignacego", "Ignacy", "Ignaś", "Ignasiu", "m"],
  ["Aleksander", "Aleksandra", "Aleksandrze", "Olek", "Olku", "m"],
  ["Stanisław", "Stanisława", "Stanisławie", "Staś", "Stasiu", "m"],
  ["Jakub", "Jakuba", "Jakubie", "Kuba", "Kubo", "m"],
  ["Szymon", "Szymona", "Szymonie", "Szymek", "Szymku", "m"],
  ["Filip", "Filipa", "Filipie", "Filipek", "Filipku", "m"],
  ["Mikołaj", "Mikołaja", "Mikołaju", "Mikołajek", "Mikołajku", "m"],
  ["Wojciech", "Wojciecha", "Wojciechu", "Wojtek", "Wojtku", "m"],
  ["Adam", "Adama", "Adamie", "Adaś", "Adasiu", "m"],
  ["Tymon", "Tymona", "Tymonie", "Tymek", "Tymku", "m"],
  ["Tymoteusz", "Tymoteusza", "Tymoteuszu", "Tymek", "Tymku", "m"],
  ["Wiktor", "Wiktora", "Wiktorze", "Wiktorek", "Wiktorku", "m"],
  ["Maksymilian", "Maksymiliana", "Maksymilianie", "Maks", "Maksiu", "m"],
  ["Maks", "Maksa", "Maksie", "Maksio", "Maksiu", "m"],
  ["Michał", "Michała", "Michale", "Michaś", "Michasiu", "m"],
  ["Kacper", "Kacpra", "Kacprze", "Kacperek", "Kacperku", "m"],
  ["Marcel", "Marcela", "Marcelu", "Marcelek", "Marcelku", "m"],
  ["Ksawery", "Ksawerego", "Ksawery", "Ksaweruś", "Ksawerusiu", "m"],
  ["Julian", "Juliana", "Julianie", "Julek", "Julku", "m"],
  ["Mateusz", "Mateusza", "Mateuszu", "Mateuszek", "Mateuszku", "m"],
  ["Piotr", "Piotra", "Piotrze", "Piotruś", "Piotrusiu", "m"],
  ["Paweł", "Pawła", "Pawle", "Pawełek", "Pawełku", "m"],
  ["Tomasz", "Tomasza", "Tomaszu", "Tomek", "Tomku", "m"],
  ["Bartosz", "Bartosza", "Bartoszu", "Bartek", "Bartku", "m"],
  ["Hubert", "Huberta", "Hubercie", "Hubercik", "Huberciku", "m"],
  ["Gabriel", "Gabriela", "Gabrielu", "Gabryś", "Gabrysiu", "m"],
  ["Natan", "Natana", "Natanie", "Natanek", "Natanku", "m"],
  ["Oliwer", "Oliwera", "Oliwerze", "Oliwerek", "Oliwerku", "m"],
  ["Igor", "Igora", "Igorze", "Igorek", "Igorku", "m"],
  ["Dawid", "Dawida", "Dawidzie", "Dawidek", "Dawidku", "m"],
  ["Krzysztof", "Krzysztofa", "Krzysztofie", "Krzyś", "Krzysiu", "m"],
  ["Marek", "Marka", "Marku", "Mareczek", "Mareczku", "m"],
  ["Bruno", "Brunona", "Brunonie", "Brunek", "Brunku", "m"],
  ["Henryk", "Henryka", "Henryku", "Henio", "Heniu", "m"],
  ["Józef", "Józefa", "Józefie", "Józio", "Józiu", "m"],
  ["Kazimierz", "Kazimierza", "Kazimierzu", "Kazio", "Kaziu", "m"],
  ["Tadeusz", "Tadeusza", "Tadeuszu", "Tadzio", "Tadziu", "m"],
  ["Witold", "Witolda", "Witoldzie", "Witek", "Witku", "m"],
  ["Ryszard", "Ryszarda", "Ryszardzie", "Rysio", "Rysiu", "m"],
  ["Zbigniew", "Zbigniewa", "Zbigniewie", "Zbyszek", "Zbyszku", "m"],
  ["Andrzej", "Andrzeja", "Andrzeju", "Andrzejek", "Andrzejku", "m"],
  ["Łukasz", "Łukasza", "Łukaszu", "Łukaszek", "Łukaszku", "m"],
  ["Karol", "Karola", "Karolu", "Karolek", "Karolku", "m"],
  ["Borys", "Borysa", "Borysie", "Borysek", "Borysku", "m"],
  ["Zofia", "Zofii", "Zofio", "Zosia", "Zosiu", "f"],
  ["Zosia", "Zosi", "Zosiu", "Zosia", "Zosiu", "f"],
  ["Hanna", "Hanny", "Hanno", "Hania", "Haniu", "f"],
  ["Hania", "Hani", "Haniu", "Hania", "Haniu", "f"],
  ["Julia", "Julii", "Julio", "Julka", "Julko", "f"],
  ["Maja", "Mai", "Maju", "Majka", "Majko", "f"],
  ["Laura", "Laury", "Lauro", "Laurka", "Laurko", "f"],
  ["Alicja", "Alicji", "Alicjo", "Ala", "Alu", "f"],
  ["Oliwia", "Oliwii", "Oliwio", "Oliwka", "Oliwko", "f"],
  ["Lena", "Leny", "Leno", "Lenka", "Lenko", "f"],
  ["Pola", "Poli", "Polu", "Polcia", "Polciu", "f"],
  ["Emilia", "Emilii", "Emilio", "Emilka", "Emilko", "f"],
  ["Nadia", "Nadii", "Nadio", "Nadusia", "Nadusiu", "f"],
  ["Amelia", "Amelii", "Amelio", "Amelka", "Amelko", "f"],
  ["Helena", "Heleny", "Heleno", "Helenka", "Helenko", "f"],
  ["Antonina", "Antoniny", "Antonino", "Tosia", "Tosiu", "f"],
  ["Tosia", "Tosi", "Tosiu", "Tosia", "Tosiu", "f"],
  ["Gabriela", "Gabrieli", "Gabrielo", "Gabrysia", "Gabrysiu", "f"],
  ["Wiktoria", "Wiktorii", "Wiktorio", "Wika", "Wiko", "f"],
  ["Natalia", "Natalii", "Natalio", "Natalka", "Natalko", "f"],
  ["Iga", "Igi", "Igo", "Iguśka", "Iguśko", "f"],
  ["Liliana", "Liliany", "Liliano", "Lila", "Lilu", "f"],
  ["Marcelina", "Marceliny", "Marcelino", "Marcelinka", "Marcelinko", "f"],
  ["Matylda", "Matyldy", "Matyldo", "Tyldzia", "Tyldziu", "f"],
  ["Michalina", "Michaliny", "Michalino", "Misia", "Misiu", "f"],
  ["Nina", "Niny", "Nino", "Ninka", "Ninko", "f"],
  ["Jagoda", "Jagody", "Jagodo", "Jagódka", "Jagódko", "f"],
  ["Aleksandra", "Aleksandry", "Aleksandro", "Ola", "Olu", "f"],
  ["Ola", "Oli", "Olu", "Ola", "Olu", "f"],
  ["Kornelia", "Kornelii", "Kornelio", "Kornelka", "Kornelko", "f"],
  ["Klara", "Klary", "Klaro", "Klarcia", "Klarciu", "f"],
  ["Barbara", "Barbary", "Barbaro", "Basia", "Basiu", "f"],
  ["Basia", "Basi", "Basiu", "Basia", "Basiu", "f"],
  ["Monika", "Moniki", "Moniko", "Monisia", "Monisiu", "f"],
  ["Anna", "Anny", "Anno", "Ania", "Aniu", "f"],
  ["Ania", "Ani", "Aniu", "Ania", "Aniu", "f"],
  ["Maria", "Marii", "Mario", "Marysia", "Marysiu", "f"],
  ["Marysia", "Marysi", "Marysiu", "Marysia", "Marysiu", "f"],
  ["Katarzyna", "Katarzyny", "Katarzyno", "Kasia", "Kasiu", "f"],
  ["Agnieszka", "Agnieszki", "Agnieszko", "Aga", "Ago", "f"],
  ["Magdalena", "Magdaleny", "Magdaleno", "Madzia", "Madziu", "f"],
  ["Ewa", "Ewy", "Ewo", "Ewunia", "Ewuniu", "f"],
  ["Krystyna", "Krystyny", "Krystyno", "Krysia", "Krysiu", "f"],
  ["Halina", "Haliny", "Halino", "Halinka", "Halinko", "f"],
  ["Teresa", "Teresy", "Tereso", "Tereska", "Teresko", "f"],
  ["Elżbieta", "Elżbiety", "Elżbieto", "Ela", "Elu", "f"],
  ["Danuta", "Danuty", "Danuto", "Danusia", "Danusiu", "f"],
  ["Irena", "Ireny", "Ireno", "Irenka", "Irenko", "f"],
  ["Wanda", "Wandy", "Wando", "Wandzia", "Wandziu", "f"],
  ["Zuzanna", "Zuzanny", "Zuzanno", "Zuzia", "Zuziu", "f"],
  ["Zuzia", "Zuzi", "Zuziu", "Zuzia", "Zuziu", "f"],
  ["Weronika", "Weroniki", "Weroniko", "Werka", "Werko", "f"],
  ["Stefania", "Stefanii", "Stefanio", "Stefcia", "Stefciu", "f"],
  ["Róża", "Róży", "Różo", "Różyczka", "Różyczko", "f"],
  ["Jadwiga", "Jadwigi", "Jadwigo", "Jadzia", "Jadziu", "f"],
  // zdrobnienia używane na co dzień jako imiona (formą podstawową jest samo zdrobnienie)
  ["Kasia", "Kasi", "Kasiu", "Kasia", "Kasiu", "f"],
  ["Gosia", "Gosi", "Gosiu", "Gosia", "Gosiu", "f"],
  ["Asia", "Asi", "Asiu", "Asia", "Asiu", "f"],
  ["Madzia", "Madzi", "Madziu", "Madzia", "Madziu", "f"],
  ["Ala", "Ali", "Alu", "Ala", "Alu", "f"],
  ["Ela", "Eli", "Elu", "Ela", "Elu", "f"],
  ["Iza", "Izy", "Izo", "Iza", "Izo", "f"],
  ["Ula", "Uli", "Ulu", "Ula", "Ulu", "f"],
  ["Mila", "Mili", "Milu", "Mila", "Milu", "f"],
  ["Lila", "Lili", "Lilu", "Lila", "Lilu", "f"],
  ["Wika", "Wiki", "Wiko", "Wika", "Wiko", "f"],
  ["Kuba", "Kuby", "Kubo", "Kuba", "Kubo", "m"],
  ["Kubuś", "Kubusia", "Kubusiu", "Kubuś", "Kubusiu", "m"],
  ["Olek", "Olka", "Olku", "Olek", "Olku", "m"],
  ["Antek", "Antka", "Antku", "Antek", "Antku", "m"],
  ["Franek", "Franka", "Franku", "Franek", "Franku", "m"],
  ["Bartek", "Bartka", "Bartku", "Bartek", "Bartku", "m"],
  ["Wojtek", "Wojtka", "Wojtku", "Wojtek", "Wojtku", "m"],
  ["Tymek", "Tymka", "Tymku", "Tymek", "Tymku", "m"],
  ["Janek", "Janka", "Janku", "Janek", "Janku", "m"],
  ["Julek", "Julka", "Julku", "Julek", "Julku", "m"],
  ["Staś", "Stasia", "Stasiu", "Staś", "Stasiu", "m"],
  ["Antoś", "Antosia", "Antosiu", "Antoś", "Antosiu", "m"],
  ["Ignaś", "Ignasia", "Ignasiu", "Ignaś", "Ignasiu", "m"],
  ["Krzyś", "Krzysia", "Krzysiu", "Krzyś", "Krzysiu", "m"],
  ["Adaś", "Adasia", "Adasiu", "Adaś", "Adasiu", "m"],
  ["Tosia", "Tosi", "Tosiu", "Tosia", "Tosiu", "f"],
];

const INDEX = new Map<string, Row>(DICTIONARY.map((r) => [r[0].toLocaleLowerCase("pl"), r]));

/** Normalizuje imię wpisane przez użytkownika: przycina, scala spacje, pierwsza litera wielka. */
export function normalizeName(input: string): string {
  const cleaned = input.normalize("NFC").trim().replace(/\s+/g, " ");
  return cleaned
    .split(/([\s-])/)
    .map((part) => (part.length > 0 && !/[\s-]/.test(part) ? part[0].toLocaleUpperCase("pl") + part.slice(1).toLocaleLowerCase("pl") : part))
    .join("");
}

const NAME_RE = /^[\p{L}][\p{L}' -]{0,28}[\p{L}]$|^[\p{L}]{2}$/u;

const BLOCKLIST = [
  "kurwa", "chuj", "huj", "pizda", "jebac", "jebać", "dupa", "cipa", "fuck", "shit", "hitler", "admin", "elofik",
];

export type NameValidation = { ok: true; name: string } | { ok: false; reason: "empty" | "too_long" | "invalid_chars" | "not_allowed" };

/** Walidacja imienia dziecka/bliskiego — chroni TTS przed wstrzyknięciem treści i wulgaryzmami. */
export function validateName(input: string): NameValidation {
  const name = normalizeName(input ?? "");
  if (!name) return { ok: false, reason: "empty" };
  if (name.length > 30) return { ok: false, reason: "too_long" };
  if (!NAME_RE.test(name)) return { ok: false, reason: "invalid_chars" };
  const flat = name.toLocaleLowerCase("pl").replace(/[\s'-]/g, "");
  if (BLOCKLIST.some((b) => flat.includes(b))) return { ok: false, reason: "not_allowed" };
  return { ok: true, name };
}

export interface NameOverrides {
  genitive?: string | null;
  vocative?: string | null;
  diminutive?: string | null;
  diminutiveVocative?: string | null;
  gender?: GrammaticalGender | null;
}

/**
 * Reguły dla zdrobnień o w pełni regularnej odmianie (używane, gdy imienia nie ma w słowniku).
 * Celowo wąskie: obejmują tylko wzorce, które w polszczyźnie odmieniają się zawsze tak samo.
 *   -sia/-zia/-cia/-dzia (Kasia, Zuzia, Kacia, Madzia) → Kasi, Kasiu
 *   -nia w krótkich imionach (Hania, Sonia; ≤ 5 liter — „Antonia” odmienia się inaczej) → Hani, Haniu
 *   -ka (Julka, Ninka, Oliwka, Majka) → Julki, Julko
 *   -ek (Franek, Bartek, Leonek; e ruchome) → Franka, Franku
 *   -ś (Antoś, Staś, Kubuś) → Antosia, Antosiu
 *   -zio/-sio/-cio/-nio/-dzio w krótkich imionach (Józio, Henio, Tadzio; nie „Aurelio”, „Antonio”) → Józia, Józiu
 */
export function ruleBasedForms(nominative: string): Row | null {
  const n = nominative;
  if (n.length < 3 || /[\s-]/.test(n)) return null;
  const low = n.toLocaleLowerCase("pl");
  const stem = (k: number) => n.slice(0, n.length - k);
  if (/(?:s|z|c|dz)ia$/.test(low) || (/nia$/.test(low) && n.length <= 5)) {
    const b = stem(1); // Kasi
    return [n, b, `${b}u`, n, `${b}u`, "f"];
  }
  if (/[^aeiouyąęó]ka$/.test(low)) {
    const b = stem(1); // Julk
    return [n, `${b}i`, `${b}o`, n, `${b}o`, "f"];
  }
  if (/[^aeiouyąęó]ek$/.test(low) && n.length >= 4) {
    const b = `${stem(2)}k`; // Frank
    return [n, `${b}a`, `${b}u`, n, `${b}u`, "m"];
  }
  if (/[aeiouyąęó]ś$/.test(low)) {
    const b = `${stem(1)}s`; // Antos
    return [n, `${b}ia`, `${b}iu`, n, `${b}iu`, "m"];
  }
  if (/(?:s|z|c|dz|n)io$/.test(low) && n.length <= 6) {
    const b = stem(1); // Józi
    return [n, `${b}a`, `${b}u`, n, `${b}u`, "m"];
  }
  return null;
}

export function getNameForms(name: string, overrides: NameOverrides = {}): NameForms {
  const nominative = normalizeName(name);
  const row = INDEX.get(nominative.toLocaleLowerCase("pl")) ?? ruleBasedForms(nominative);
  const base: NameForms = row
    ? { nominative, genitive: row[1], vocative: row[2], diminutive: row[3], diminutiveVocative: row[4], gender: row[5], known: true }
    : { nominative, genitive: null, vocative: null, diminutive: null, diminutiveVocative: null, gender: null, known: false };
  const pick = (v: string | null | undefined, fallback: string | null) => (v && v.trim() ? normalizeName(v) : fallback);
  return {
    nominative,
    genitive: pick(overrides.genitive, base.genitive),
    vocative: pick(overrides.vocative, base.vocative),
    diminutive: pick(overrides.diminutive, base.diminutive),
    diminutiveVocative: pick(overrides.diminutiveVocative, base.diminutiveVocative),
    gender: overrides.gender ?? base.gender,
    known: base.known || Boolean(overrides.vocative || overrides.genitive),
  };
}

/** Forma do bezpośredniego zwrotu w bajce/powitaniu. Kolejność: wybór rodzica → słownik → mianownik. */
export type AddressStyle = "diminutive" | "full" | "name_only";

export function addressForm(forms: NameForms, style: AddressStyle = "diminutive"): string {
  if (style === "name_only") return forms.nominative;
  if (style === "diminutive") return forms.diminutiveVocative ?? forms.vocative ?? forms.nominative;
  return forms.vocative ?? forms.nominative;
}

/** CTA na landing page bez wymuszania błędnej odmiany. */
export function sampleCtaLabel(rawName: string): string {
  const v = validateName(rawName);
  if (!v.ok) return "Posłuchaj bajki";
  const forms = getNameForms(v.name);
  return forms.genitive ? `Posłuchaj bajki dla ${forms.genitive}` : `Posłuchaj bajki, w której gra ${forms.nominative}`;
}

/** „dla Leona” / „— Kaja” — bezpieczna fraza dopełniacza do nagłówków. */
export function forPhrase(forms: NameForms): string {
  return forms.genitive ? `dla ${forms.genitive}` : `— ${forms.nominative}`;
}

/** Klucz cache imienia — niezależny od wielkości liter i białych znaków. */
export function nameCacheKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("pl");
}

/** Wybór wariantu słowa zależnie od rodzaju gramatycznego. Brak rodzaju → forma neutralna. */
export function byGender(gender: GrammaticalGender | null | undefined, m: string, f: string, n: string): string {
  if (gender === "m") return m;
  if (gender === "f") return f;
  return n;
}
