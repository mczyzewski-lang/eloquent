import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/Header";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { authConfig } from "@/lib/auth/public-config";
import { getSessionUser } from "@/lib/auth/session";
import { getFamilyByOwner } from "@/lib/services/families";
import { validateName } from "@/lib/domain/names";
import { getCoverMap } from "@/lib/ai/images";

export const metadata = { title: "Stwórz świat Elofika", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ imie?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (user && (await getFamilyByOwner(user.id))) redirect("/app");
  const v = validateName(sp.imie ?? "");
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page py-8">
        <OnboardingWizard initialName={v.ok ? v.name : ""} auth={authConfig()} loggedIn={Boolean(user)} day1Cover={(await getCoverMap())["dzien-01-tajemniczy-slad"] ?? null} />
      </main>
    </div>
  );
}
