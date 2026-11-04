/**
 * Program poleceń: „Zaproś 3 rodziny — odbierz miesiąc za darmo i sekretną bajkę”.
 * Skuteczne zaproszenie = NOWA, niezależna rodzina (inny numer/e-mail), która założyła profil
 * i wysłuchała do końca pierwszej bajki (albo opłaciła abonament).
 */
// special_story / bonus_adventure — nagrody z poprzedniej wersji programu (zostają w historii)
export type ReferralReward = "special_story" | "bonus_adventure" | "free_month" | "secret_story";

export const REFERRAL_GOAL = 3;

export const REFERRAL_TIERS: { threshold: number; reward: ReferralReward; label: string }[] = [
  { threshold: REFERRAL_GOAL, reward: "free_month", label: "Miesiąc Elofik Premium gratis" },
  { threshold: REFERRAL_GOAL, reward: "secret_story", label: "Sekretna bajka (15 min) z całą rodziną" },
];

export interface ReferralCandidate {
  referrerFamilyId: string;
  referrerEmail: string;
  refereeFamilyId: string;
  refereeEmail: string;
  referrerPhone?: string | null;
  refereePhone?: string | null;
  /** Czy pierwsza faktura subskrypcji polecanego została faktycznie opłacona */
  refereeFirstPaymentSucceeded: boolean;
  /** Czy polecany miał już wcześniej konto / subskrypcję */
  refereeWasCustomerBefore: boolean;
  /** Odcisk karty (Stripe card fingerprint) — wykrywa samopolecenia */
  referrerCardFingerprint?: string | null;
  refereeCardFingerprint?: string | null;
}

export type QualifyResult = { qualified: true } | { qualified: false; reason: string };

function emailRoot(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split("@");
  const base = local.split("+")[0].replace(/\./g, domain === "gmail.com" ? "" : ".");
  return `${base}@${domain}`;
}

export function qualifyReferral(c: ReferralCandidate): QualifyResult {
  if (c.referrerFamilyId === c.refereeFamilyId) return { qualified: false, reason: "self_referral" };
  if (c.referrerEmail && c.refereeEmail && emailRoot(c.referrerEmail) === emailRoot(c.refereeEmail)) return { qualified: false, reason: "same_email" };
  if (c.referrerPhone && c.referrerPhone === c.refereePhone) return { qualified: false, reason: "same_phone" };
  if (c.referrerCardFingerprint && c.referrerCardFingerprint === c.refereeCardFingerprint) return { qualified: false, reason: "same_card" };
  if (c.refereeWasCustomerBefore) return { qualified: false, reason: "existing_customer" };
  if (!c.refereeFirstPaymentSucceeded) return { qualified: false, reason: "not_paid" };
  return { qualified: true };
}

/** Nagrody należne przy danej liczbie skutecznych poleceń, których jeszcze nie przyznano. */
export function rewardsDue(qualifiedCount: number, alreadyGranted: ReferralReward[]): ReferralReward[] {
  return REFERRAL_TIERS.filter((t) => qualifiedCount >= t.threshold && !alreadyGranted.includes(t.reward)).map((t) => t.reward);
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function generateReferralCode(random: () => number = Math.random): string {
  return Array.from({ length: 8 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
}
