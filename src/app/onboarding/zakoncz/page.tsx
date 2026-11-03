import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { FinishOnboarding } from "@/components/onboarding/FinishOnboarding";

export const metadata = { title: "Kończymy przygotowania", robots: { index: false } };

export default async function FinishPage() {
  if (!(await getSessionUser())) redirect("/logowanie?next=/onboarding/zakoncz");
  return <FinishOnboarding />;
}
