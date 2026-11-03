import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/Header";
import { Elofik } from "@/components/elofik/Elofik";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { adminPasswordConfigured } from "@/lib/auth/admin-password";

export const metadata = { title: "Logowanie administratora", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.isAdmin) redirect("/admin");
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-md py-10">
        <div className="mx-auto w-24"><Elofik mood="listening" /></div>
        <h1 className="mt-4 text-center text-3xl font-semibold">Panel administratora</h1>
        <div className="card-soft mt-6 p-6">
          {adminPasswordConfigured() ? (
            <AdminLoginForm />
          ) : (
            <p className="text-sm text-muted">
              Logowanie hasłem nie jest skonfigurowane. Ustaw zmienne <code>ADMIN_EMAILS</code> i <code>ADMIN_PASSWORD_HASH</code> (wygeneruj: <code>node scripts/hash-password.mjs</code>) i uruchom aplikację ponownie.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
