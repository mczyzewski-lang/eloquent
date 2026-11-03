/**
 * Seed katalogu bajek (i opcjonalnie rodziny demo) do skonfigurowanej bazy.
 *   npm run seed:demo                 — bajki startowe
 *   SEED_DEMO_FAMILY_USER_ID=<uuid> npm run seed:demo — dodatkowo rodzina Leona dla wskazanego użytkownika
 */
import { ensureStoriesSeeded } from "@/lib/services/stories";
import { seedDemoFamily } from "@/lib/demo/seed";

async function main() {
  await ensureStoriesSeeded(true);
  console.info("✓ Katalog bajek zaseedowany");
  const uid = process.env.SEED_DEMO_FAMILY_USER_ID;
  if (uid) {
    const f = await seedDemoFamily(uid);
    console.info(`✓ Rodzina demo: ${f.id}`);
  }
  // MemoryDb zapisuje z opóźnieniem — daj mu chwilę
  await new Promise((r) => setTimeout(r, 200));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
