import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/Header";
import { Elofik } from "@/components/elofik/Elofik";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { adminConfigStatus, adminPasswordConfigured } from "@/lib/auth/admin-password";

export const metadata = { title: "Logowanie administratora", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getSessionUser().catch(() => null);
  if (user?.isAdmin) redirect("/admin");
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-md py-10">
        <div className="mx-auto w-24"><Elofik mood="listening" /></div>
        <h1 className="mt-4 text-center text-3xl font-semibold">Panel administratora</h1>
        <div className="card-soft mt-6 p-6">{adminPasswordConfigured() ? <AdminLoginForm /> : <ConfigHelp />}</div>
      </main>
    </div>
  );
}

/** Pokazuje, której zmiennej brakuje — bez ujawniania wartości. */
function ConfigHelp() {
  const st = adminConfigStatus();
  const row = (ok: boolean, name: string, hint: string) => (
    <li className="flex gap-2">
      <span className={ok ? "font-bold text-sage-deep" : "font-bold text-red-600"}>{ok ? "✓" : "✗"}</span>
      <span>
        <code>{name}</code> — {ok ? "ustawione" : hint}
      </span>
    </li>
  );
  return (
    <div className="space-y-3 text-sm text-muted" data-testid="admin-config-help">
      <p>Logowanie hasłem nie jest jeszcze skonfigurowane na serwerze. Stan zmiennych środowiskowych:</p>
      <ul className="space-y-1">
        {row(st.emails, "ADMIN_EMAILS", "brak (np. admin@elofik.com)")}
        {row(st.hash && st.hashFormatOk, "ADMIN_PASSWORD_HASH", st.hash ? "nieprawidłowy format — wklej całą wartość zaczynającą się od scrypt:" : "brak")}
        {row(st.sessionSecret, "SESSION_SECRET", "brak lub krótszy niż 32 znaki")}
      </ul>
      <p>
        Railway → serwis aplikacji → <strong>Variables</strong> → dodaj zmienne → <strong>Deploy</strong>. Zmiany działają dopiero po ponownym wdrożeniu.
      </p>
    </div>
  );
}
