/**
 * Numery telefonów rodziców (logowanie kodem SMS).
 * Przyjmujemy zapis z odstępami/myślnikami; bez prefiksu kraju zakładamy Polskę (+48).
 */

/** Normalizuje do formatu E.164 (np. +48600123456) albo zwraca null, gdy numer jest nieprawidłowy. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim().replace(/[\s\-().]/g, "");
  if (!raw) return null;
  let digits: string;
  if (raw.startsWith("+")) digits = raw.slice(1);
  else if (raw.startsWith("00")) digits = raw.slice(2);
  else if (/^\d{9}$/.test(raw)) digits = `48${raw}`;
  else digits = raw;
  if (!/^\d{8,15}$/.test(digits)) return null;
  // Polska: zawsze 9 cyfr po prefiksie, komórki zaczynają się od 4–8
  if (digits.startsWith("48") && !/^48[4-8]\d{8}$/.test(digits)) return null;
  return `+${digits}`;
}

/** Do wyświetlania: +48 600 123 456. */
export function formatPhone(e164: string): string {
  const m = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+48 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Do logów i komunikatów: +48 *** *** 456. */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)} *** *** ${e164.slice(-3)}`;
}
