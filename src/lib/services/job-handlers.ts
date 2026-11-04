import { registerJobHandler } from "./jobs";
import { getCustomStory } from "./custom-stories";
import { SECRET_STORY, SECRET_STORY_ID } from "@/content/secret-story";
import { nextRoutineAt } from "@/lib/domain/routine";
import { getStoryVersion } from "./stories";
import { buildTemplateContext, getFamilyBundle } from "./families";
import { generateCore, renderStoryForFamily } from "./audio-pipeline";
import { prefetchGreetings } from "./greetings";
import { sendDailyEmails } from "./notifications";

registerJobHandler("render_story", async (p) => {
  const id = String(p.storyId);
  const story = id === SECRET_STORY_ID ? SECRET_STORY : id.startsWith("wlasna-") ? await getCustomStory(String(p.familyId), id) : await getStoryVersion(id);
  const bundle = await getFamilyBundle(String(p.familyId));
  if (!story || !bundle) return;
  // powitanie w bajce dopasowane do pory, o której rodzina zwykle słucha
  await renderStoryForFamily(story, buildTemplateContext(bundle), bundle.family.id, { introAt: nextRoutineAt(bundle.family.listening_routine, bundle.family.timezone) });
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
