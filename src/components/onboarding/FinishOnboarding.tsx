"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Elofik } from "@/components/elofik/Elofik";
import { DRAFT_KEY, submitDraft, type OnboardingDraft } from "./OnboardingWizard";

/** Po powrocie z magic linka: zapis szkicu onboardingu (z localStorage) do konta. */
export function FinishOnboarding() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return router.replace("/onboarding");
        await submitDraft(JSON.parse(raw) as OnboardingDraft);
        router.replace("/app?witaj=1");
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [router]);
  return (
    <main className="paper flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <div className="w-32"><Elofik mood="listening" /></div>
      <p className="mt-4 font-display text-xl text-navy">{err ?? "Elofik zapisuje imiona w swojej księdze…"}</p>
      {err && <a href="/onboarding" className="mt-4 underline">Wróć do onboardingu</a>}
    </main>
  );
}
