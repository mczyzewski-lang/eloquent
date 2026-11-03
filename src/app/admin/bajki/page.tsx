import Link from "next/link";
import { getAllStoriesForAdmin } from "@/lib/services/stories";
import { validateStory } from "@/lib/domain/story";
import { STORY_ROADMAP } from "@/content/stories";
import { Badge } from "@/components/ui/card";
import { GenerateStoryForm } from "@/components/admin/GenerateStoryForm";
import { BulkCovers } from "@/components/admin/BulkCovers";
import { IMAGE_USD_ESTIMATE } from "@/lib/ai/images";

const STATUS_TONE = { draft: "muted", in_review: "peach", approved: "gold", core_generated: "gold", published: "sage", archived: "muted" } as const;

export default async function AdminStories() {
  const stories = await getAllStoriesForAdmin();
  const nextDay = Math.max(0, ...stories.filter((s) => s.row.status !== "archived").map((s) => s.row.day_number)) + 1;
  const suggestion = STORY_ROADMAP.find((r) => r.day === nextDay);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">CMS bajek</h1>
      <p className="text-muted">Przepływ: generowanie scenariusza → edycja i segmentacja → zatwierdzenie → generowanie CORE (raz) → publikacja. Scenariusze nie są publikowane bez zatwierdzenia przez administratora.</p>
      <BulkCovers
        estimateUsd={IMAGE_USD_ESTIMATE}
        items={stories
          .filter(({ row, data }) => data && row.status !== "archived" && row.status !== "draft")
          .map(({ row, data }) => ({ storyId: row.id, title: data!.title, dayNumber: row.day_number, coverUrl: row.cover_path ? `/api/covers/${row.id}?v=${encodeURIComponent(row.updated_at)}` : null }))}
      />
      <GenerateStoryForm defaultDay={nextDay} defaultWord={suggestion?.word ?? ""} defaultTheme={suggestion?.title ?? ""} />
      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy/5 text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-3">Dzień</th><th className="p-3">Tytuł</th><th className="p-3">Słowo</th><th className="p-3">Status</th><th className="p-3">Wersja</th><th className="p-3">Uwagi redakcyjne</th></tr>
          </thead>
          <tbody>
            {stories.map(({ row, data }) => {
              const issues = data ? validateStory(data) : [];
              return (
                <tr key={row.id} className="border-t border-navy/5">
                  <td className="p-3 font-semibold">{row.day_number}</td>
                  <td className="p-3"><Link className="font-semibold text-navy underline" href={`/admin/bajki/${row.id}`}>{data?.title ?? row.id}</Link></td>
                  <td className="p-3">{data?.wordOfDay}</td>
                  <td className="p-3"><Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge></td>
                  <td className="p-3">v{row.current_version}</td>
                  <td className="p-3 text-xs text-muted">{issues.length ? `${issues.length} uwag` : "OK"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-display text-lg font-semibold">Harmonogram (plan kolejnych dni)</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {STORY_ROADMAP.map((r) => <li key={r.day}>Dzień {r.day}: <strong>{r.word}</strong> — {r.title}</li>)}
        </ul>
      </div>
    </div>
  );
}
