import { notFound, redirect } from "next/navigation";
import { requireFamily } from "@/lib/auth/guards";
import { AccessDeniedError, assertStoryAccessible } from "@/lib/services/access";
import { addressForm } from "@/lib/domain/names";
import { StoryExperience } from "@/components/story/StoryExperience";
import { getCoverMap } from "@/lib/ai/images";

export const metadata = { title: "Bajka", robots: { index: false } };

export default async function StoryPage({ params, searchParams }: { params: Promise<{ storyId: string }>; searchParams: Promise<{ bez_powitania?: string }> }) {
  const { storyId } = await params;
  const sp = await searchParams;
  const { bundle } = await requireFamily(`/app/bajka/${storyId}`);
  let story;
  try {
    ({ story } = await assertStoryAccessible(bundle.family, storyId));
  } catch (e) {
    if (e instanceof AccessDeniedError && e.code === "locked") redirect("/app?zablokowana=1");
    notFound();
  }
  const forms = bundle.childForms!;
  const ritual = bundle.family.voice_greeting_enabled && !sp.bez_powitania;
  return (
    <StoryExperience
      story={{
        storyId: story.storyId,
        dayNumber: story.dayNumber,
        title: story.title,
        wordOfDay: story.wordOfDay,
        wordDefinition: story.wordDefinition,
        parentQuestion: story.parentQuestion,
        estimatedMinutes: story.estimatedMinutes,
        coverUrl: (await getCoverMap())[story.storyId] ?? null,
      }}
      childName={forms.nominative}
      childAddress={addressForm(forms, bundle.child!.address_style)}
      locale={bundle.family.locale}
      voiceRitual={ritual}
      needsConsent={!bundle.family.voice_consent_at}
    />
  );
}
