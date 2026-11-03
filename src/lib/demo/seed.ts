/** Dane demonstracyjne: rodzina Leona. Używane przez /demo oraz `npm run seed:demo`. */
import { getDb, nowIso } from "@/lib/db";
import { createOrUpdateFamily, getFamilyByOwner } from "@/lib/services/families";
import { ensureStoriesSeeded } from "@/lib/services/stories";

export const DEMO_FAMILY = {
  email: "leon.demo@elofik.com",
  child: { name: "Leon", age: 5, addressStyle: "diminutive" as const, gender: "m" as const, diminutive: null, vocative: null, diminutiveVocative: null },
  members: [
    { relation: "mom" as const, name: "Monika" },
    { relation: "dad" as const, name: "Marek" },
    { relation: "grandma" as const, name: "Basia" },
    { relation: "grandpa" as const, name: "Jan" },
    { relation: "dog" as const, name: "Burek" },
  ],
  interests: ["kosmos", "zwierzeta", "przygody"],
};

export async function seedDemoFamily(userId: string, opts: { daysAgo?: number; subscribed?: boolean } = {}) {
  await ensureStoriesSeeded(true);
  const db = getDb();
  const daysAgo = opts.daysAgo ?? 6;
  let family = await getFamilyByOwner(userId);
  if (!family) {
    family = await createOrUpdateFamily(userId, { ...DEMO_FAMILY, locale: "pl", timezone: "Europe/Warsaw", referralCode: null });
  }
  // aktywacja N dni temu o 7:00 rano — tak, by Dzień N+1 był „dzisiaj”
  const activated = new Date(Date.now() - daysAgo * 86_400_000);
  activated.setUTCHours(5, 0, 0, 0);
  await db.update("families", { id: family.id }, { activated_at: activated.toISOString(), voice_consent_at: family.voice_consent_at ?? nowIso() });
  if (opts.subscribed !== false && !(await db.findOne("subscriptions", { family_id: family.id, source: "demo" }))) {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    await db.insert("subscriptions", { family_id: family.id, source: "demo", stripe_subscription_id: null, status: "active", current_period_end: end.toISOString(), cancel_at_period_end: false, created_at: nowIso(), updated_at: nowIso() });
  }
  return family;
}
