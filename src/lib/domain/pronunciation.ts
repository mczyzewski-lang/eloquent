/**
 * Słownik wymowy dla TTS. Zmiana zawartości = podbicie PRONUNCIATION_VERSION,
 * co (przez hash cache) unieważnia tylko segmenty zawierające zmienione słowa
 * w kolejnych generacjach — stare pliki pozostają w storage do czasu sprzątania.
 */
export const PRONUNCIATION_VERSION = "PRON_V1";

/** Klucz: słowo (case-insensitive). Wartość: zapis fonetyczny przekazywany do TTS. */
const RESPELLINGS: Record<string, string> = {
  elofik: "Elofik",
  noah: "Noa",
  liam: "Lijam",
  ivy: "Ajwi",
  chloe: "Kloe",
  sophie: "Sofi",
  jayden: "Dżejden",
  nathan: "Natan",
  oliver: "Oliwer",
  jessica: "Dżesika",
};

export function applyPronunciation(text: string, extra: Record<string, string> = {}): string {
  const dict = { ...RESPELLINGS, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k.toLowerCase(), v])) };
  return text.replace(/[\p{L}]+/gu, (word) => {
    const hit = dict[word.toLowerCase()];
    return hit ?? word;
  });
}
