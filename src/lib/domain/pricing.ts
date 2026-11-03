/** Cennik. Kwoty w groszach (PLN), brutto. */
export const PRICING = {
  currency: "pln",
  premiumMonthlyGross: 3990,
  giftMonthGross: 3990,
  vatRate: 0.23,
} as const;

export function formatPln(grosze: number, locale = "pl-PL"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "PLN" }).format(grosze / 100);
}

export const PREMIUM_FEATURES = [
  "Jedna nowa bajka każdego dnia",
  "Personalizacja imion dziecka i bliskich",
  "Codzienny rytuał „Hej Elofik!”",
  "Archiwum wszystkich odblokowanych bajek",
  "Biblioteka poznanych słów",
  "Odtwarzanie bez limitu",
  "Zarządzanie profilem rodziny",
];
