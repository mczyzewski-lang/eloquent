import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { Logo } from "@/components/elofik/Elofik";
import { isDemoMode, hasElevenLabs, hasOpenAI, hasStripe } from "@/lib/config";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/bajki", "CMS bajek"],
  ["/admin/powitania", "Powitania Elofika"],
  ["/admin/koszty", "Koszty AI"],
  ["/admin/ustawienia", "Ustawienia i klucze API"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await ensureRuntimeSettings();
  const flags = [
    ["Dane", isDemoMode() ? "demo (plik)" : "Supabase"],
    ["TTS/STT", hasElevenLabs() ? "ElevenLabs" : "mock"],
    ["OpenAI", hasOpenAI() ? "tak" : "mock"],
    ["Stripe", hasStripe() ? "tak" : "symulacja"],
  ];
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-navy/10 bg-white">
        <div className="container-page flex flex-wrap items-center gap-4 py-3">
          <Link href="/admin"><Logo className="text-xl" /></Link>
          <nav className="flex flex-wrap gap-1 text-sm font-semibold">
            {NAV.map(([h, l]) => (
              <Link key={h} href={h} className="rounded-full px-3 py-1.5 hover:bg-navy/5">{l}</Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            {flags.map(([k, v]) => (
              <span key={k} className="rounded-full bg-navy/5 px-2 py-1">{k}: <strong>{v}</strong></span>
            ))}
            <span className="rounded-full bg-gold/30 px-2 py-1">{admin.email}</span>
          </div>
        </div>
      </header>
      <main className="container-page py-6">{children}</main>
    </div>
  );
}
