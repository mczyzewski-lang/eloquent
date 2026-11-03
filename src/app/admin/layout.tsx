import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/AdminNav";
import { dataStorageInfo, hasElevenLabs, hasOpenAI, hasStripe } from "@/lib/config";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await ensureRuntimeSettings();
  const storage = dataStorageInfo().kind;
  const flags: [string, string, boolean][] = [
    ["Dane", { supabase: "Supabase", volume: "wolumen", local: "plik lokalny", ephemeral: "ulotne!" }[storage], storage === "supabase" || storage === "volume"],
    ["TTS/STT", hasElevenLabs() ? "ElevenLabs" : "mock", hasElevenLabs()],
    ["OpenAI", hasOpenAI() ? "aktywne" : "mock", hasOpenAI()],
    ["Stripe", hasStripe() ? "aktywne" : "symulacja", hasStripe()],
  ];
  const version = (process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.SOURCE_COMMIT ?? "lokalna").slice(0, 7);
  return (
    <div className="admin-ui min-h-dvh lg:flex">
      <aside className="border-b border-[#e9e9e7] bg-[#f7f7f5] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-3 pb-1 pt-3">
          <Link href="/admin" className="flex items-center gap-2 rounded-[5px] px-1 py-1 hover:bg-[rgb(55_53_47/0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/elofik-mark.png" alt="" className="h-5 w-5 rounded-[4px] object-contain" />
            <span className="text-sm font-semibold text-[#37352f]">Elofik · Admin</span>
          </Link>
          <Link href="/" className="ml-auto text-xs text-[#91918e] hover:text-[#37352f]">strona ↗</Link>
        </div>
        <div className="px-2 py-2 lg:flex-1 lg:overflow-y-auto">
          <AdminNav />
        </div>
        <div className="hidden space-y-1 border-t border-[#e9e9e7] px-3 py-3 text-xs text-[#787774] lg:block">
          {flags.map(([k, v, ok]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span>{k}</span>
              <span className="flex items-center gap-1.5 font-medium text-[#37352f]">
                <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[#4dab9a]" : "bg-[#e9b949]"}`} aria-hidden />
                {v}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2" title="Wdrożona wersja (commit)">
            <span>Wersja</span>
            <code className="!bg-transparent !p-0 !text-[#37352f]">{version}</code>
          </div>
          <p className="truncate pt-1" title={admin.email}>{admin.email}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 lg:px-12 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
