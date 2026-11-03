import { registerJobHandler } from "./jobs";
import { getStoryVersion } from "./stories";
import { buildTemplateContext, getFamilyBundle } from "./families";
import { generateCore, renderStoryForFamily } from "./audio-pipeline";
import { prefetchGreetings } from "./greetings";
import { sendDailyEmails } from "./notifications";

registerJobHandler("render_story", async (p) => {
  const story = await getStoryVersion(String(p.storyId));
  const bundle = await getFamilyBundle(String(p.familyId));
  if (!story || !bundle) return;
  await renderStoryForFamily(story, buildTemplateContext(bundle), bundle.family.id);
});

registerJobHandler("render_greeting", async (p) => {
  const bundle = await getFamilyBundle(String(p.familyId));
  const ctx = bundle && buildTemplateContext(bundle);
  if (!bundle || !ctx) return;
  await prefetchGreetings(bundle.family.id, ctx, bundle.family.locale, Number(p.nextStoryDay ?? 1));
});

registerJobHandler("generate_core", async (p) => {
  const story = await getStoryVersion(String(p.storyId));
  if (story) await generateCore(story);
});

// Ilustracje generuje wyłącznie admin w panelu (z podglądem i akceptacją) — bez zadań w tle.
registerJobHandler("generate_illustration", async () => {
  throw new Error("Ilustracje generuje się w Admin → Ilustracje");
});

registerJobHandler("send_daily_email", async () => {
  await sendDailyEmails();
});
