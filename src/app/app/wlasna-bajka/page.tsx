import Link from "next/link";
import { Headphones, Sparkles } from "lucide-react";
import { requireFamily } from "@/lib/auth/guards";
import { getAccess } from "@/lib/services/access";
import { customStoryQuota, listCustomStories } from "@/lib/services/custom-stories";
import { AppShell } from "@/components/app/AppShell";
import { CustomStoryForm } from "@/components/app/CustomStoryForm";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RELATION_LABELS } from "@/lib/services/families";

export const metadata = { title: "Własna bajka", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CustomStoryPage() {
  const { bundle } = await requireFamily("/app/wlasna-bajka");
  const [access, quota, stories] = await Promise.all([getAccess(bundle.family.id), customStoryQuota(bundle.family.id), listCustomStories(bundle.family.id)]);
  const relations = [...new Map(bundle.members.map((m) => [m.relation, { relation: m.relation, label: `${RELATION_LABELS[m.relation]} ${m.name}` }])).values()];
  return (
    <AppShell active="bajki" title="Własna bajka" kids={bundle.children.map((c) => ({ id: c.id, name: c.name }))} activeChildId={bundle.child?.id}>
      <h1 className="text-2xl font-semibold">Wymyśl bajkę, a Elofik ją opowie</h1>
      <p className="mt-1 text-muted">Opisz w kilku zdaniach, o czym ma być przygoda. Elofik napisze bajkę, w której {bundle.childForms?.nominative ?? "Twoje dziecko"} jest współbohaterem, i przeczyta ją swoim głosem.</p>

      {access.hasAccess ? (
        <div className="mt-5">
          <CustomStoryForm relations={relations} quota={quota} childName={bundle.childForms?.nominative ?? ""} />
        </div>
      ) : (
        <Card className="mt-5 border-2 border-gold bg-gold/10">
          <p className="font-display text-xl font-semibold text-navy">Własne bajki są w Elofik Premium</p>
          <p className="mt-1 text-muted">Z abonamentem możesz stworzyć {quota.limit} własne bajki w miesiącu — np. o wizycie u dentysty, nowym rodzeństwie albo podróży nad morze.</p>
          <Link href="/subskrypcja" className={buttonVariants({ size: "md", className: "mt-4" })}>Odblokuj Elofik Premium</Link>
        </Card>
      )}

      {stories.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Wasze bajki</h2>
          <ul className="mt-3 space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <Link href={`/app/bajka/${s.story_id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.99]">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gold/30 text-navy"><Sparkles className="h-6 w-6" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-semibold text-navy">{s.title}</span>
                    <span className="block truncate text-xs text-muted">słowo: {s.word} · {new Date(s.created_at).toLocaleDateString("pl-PL")}</span>
                  </span>
                  <Headphones className="h-5 w-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
