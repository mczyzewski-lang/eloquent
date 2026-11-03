/**
 * Sesja użytkownika (dorosłego opiekuna).
 * - Produkcja: Supabase Auth (magic link, Google, Apple) przez @supabase/ssr.
 * - Demo/dev: podpisane cookie HMAC z identyfikatorem użytkownika.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { config, getSessionSecret, isDemoMode } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import { sign, unsign } from "@/lib/domain/tokens";
import { adminPasswordConfigured, adminUserId } from "./admin-password";

export const DEMO_COOKIE = "elofik_session";
export const ADMIN_COOKIE = "elofik_admin";
const ADMIN_SESSION_HOURS = 12;

export interface SessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export async function supabaseServerClient() {
  const store = await cookies();
  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // wywołanie z Server Component — odświeżenie sesji obsługuje proxy.ts
        }
      },
    },
  });
}

async function ensureUserRow(id: string, email: string) {
  const db = getDb();
  const existing = await db.findOne("users", { id });
  const isAdmin = config.adminEmails.includes(email.toLowerCase());
  if (existing) {
    if (isAdmin && !existing.is_admin) await db.update("users", { id }, { is_admin: true });
    return { ...existing, is_admin: existing.is_admin || isAdmin };
  }
  return db.insert("users", { id, email: email.toLowerCase(), is_admin: isAdmin, created_at: nowIso() });
}

/** Sesja admina zalogowanego hasłem: podpisane cookie „email|wygaśnięcie”, ważne 12 h. */
async function adminFromCookie(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  const value = raw ? unsign(raw, getSessionSecret()) : null;
  if (!value) return null;
  const [email, exp] = value.split("|");
  if (!email || Number(exp) < Date.now() / 1000) return null;
  // e-mail musi wciąż być na liście ADMIN_EMAILS (usunięcie z listy = natychmiastowe odebranie dostępu)
  if (!config.adminEmails.includes(email) || !adminPasswordConfigured()) return null;
  return { id: adminUserId(email), email, isAdmin: true };
}

export async function adminSignIn(email: string) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_HOURS * 3600;
  (await cookies()).set(ADMIN_COOKIE, sign(`${email.toLowerCase()}|${exp}`, getSessionSecret()), {
    httpOnly: true,
    sameSite: "strict",
    secure: config.appEnv === "production",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const admin = await adminFromCookie();
  if (admin) return admin;
  if (isDemoMode()) {
    const raw = (await cookies()).get(DEMO_COOKIE)?.value;
    const userId = raw ? unsign(raw, getSessionSecret()) : null;
    if (!userId) return null;
    const user = await getDb().findOne("users", { id: userId });
    // gdy skonfigurowano hasło admina, konto demo NIGDY nie daje uprawnień admina — tylko logowanie hasłem
    const demoAdmin = !adminPasswordConfigured() && config.appEnv !== "production" && (user?.is_admin || config.adminEmails.includes(user?.email ?? ""));
    return user ? { id: user.id, email: user.email, isAdmin: Boolean(demoAdmin) } : null;
  }
  const supabase = await supabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  const row = await ensureUserRow(data.user.id, data.user.email);
  return { id: row.id, email: row.email, isAdmin: row.is_admin };
}

/** Demo: logowanie bez wysyłki e-maila (symulacja magic linka). */
export async function demoSignIn(email: string, opts: { admin?: boolean } = {}): Promise<SessionUser> {
  if (!isDemoMode()) throw new Error("demoSignIn dostępne tylko w trybie demo");
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  let user = await db.findOne("users", { email: normalized });
  if (!user) user = await db.insert("users", { email: normalized, is_admin: Boolean(opts.admin), created_at: nowIso() });
  else if (opts.admin && !user.is_admin) user = (await db.update("users", { id: user.id }, { is_admin: true }))[0];
  (await cookies()).set(DEMO_COOKIE, sign(user.id, getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.appEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { id: user.id, email: user.email, isAdmin: user.is_admin };
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  if (isDemoMode()) {
    (await cookies()).delete(DEMO_COOKIE);
    return;
  }
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
}
