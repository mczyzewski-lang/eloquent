import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import { getFamilyBundle, getFamilyByOwner, type FamilyBundle } from "@/lib/services/families";
import { getDb, nowIso } from "@/lib/db";

export async function requireUser(next = "/app"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/logowanie?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireFamily(next = "/app"): Promise<{ user: SessionUser; bundle: FamilyBundle }> {
  const user = await requireUser(next);
  const family = await getFamilyByOwner(user.id);
  if (!family) redirect("/onboarding");
  const bundle = await getFamilyBundle(family.id);
  if (!bundle?.child) redirect("/onboarding");
  return { user, bundle };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/logowanie/admin");
  if (!user.isAdmin) redirect("/logowanie/admin");
  return user;
}

export async function auditLog(actor: SessionUser, action: string, target: string | null, meta: Record<string, unknown> = {}) {
  await getDb().insert("admin_audit_logs", { actor_user_id: actor.id, action, target, meta, created_at: nowIso() });
}

/** Wersja dla route handlerów API: zwraca null zamiast przekierowania. */
export async function apiFamily(): Promise<{ user: SessionUser; bundle: FamilyBundle } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const family = await getFamilyByOwner(user.id);
  if (!family) return null;
  const bundle = await getFamilyBundle(family.id);
  return bundle ? { user, bundle } : null;
}
