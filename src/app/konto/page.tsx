import { requireFamily } from "@/lib/auth/guards";
import { getAccess } from "@/lib/services/access";
import { referralSummary } from "@/lib/services/referrals";
import { getDb } from "@/lib/db";
import { hasStripe } from "@/lib/config";
import { absoluteUrl } from "@/lib/config";
import { AppShell } from "@/components/app/AppShell";
import { formatPhone } from "@/lib/domain/phone";
import { AccountPanel } from "@/components/account/AccountPanel";
import { getFamilyLibrary } from "@/lib/services/access";
import { getProgressMap } from "@/lib/services/progress";

export const metadata = { title: "Panel rodzica", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, bundle } = await requireFamily("/konto");
  const [access, referrals, prefs, lib, progress] = await Promise.all([
    getAccess(bundle.family.id),
    referralSummary(bundle.family.id),
    getDb().findOne("notification_preferences", { family_id: bundle.family.id }),
    getFamilyLibrary(bundle.family),
    getProgressMap(bundle.family.id),
  ]);
  const child = bundle.child!;
  return (
    <AppShell active="konto" title="Konto">
        <h1 className="text-3xl font-semibold">Panel rodzica</h1>
        <p className="mt-1 text-muted">{user.phone ? formatPhone(user.phone) : user.email}</p>
        <AccountPanel
          child={{ name: child.name, age: child.age, diminutive: child.diminutive ?? "", vocative: child.vocative_override ?? "", gender: child.gender, addressStyle: child.address_style }}
          members={bundle.members.map((m) => ({ relation: m.relation, name: m.name }))}
          interests={bundle.interests}
          access={access}
          stripeEnabled={hasStripe()}
          referral={{ link: absoluteUrl(`/?ref=${bundle.family.referral_code}`), qualified: referrals.qualified, signups: referrals.signups, rewards: referrals.rewards.map((r) => r.reward) }}
          settings={{
            voiceGreetingEnabled: bundle.family.voice_greeting_enabled,
            voiceConsent: Boolean(bundle.family.voice_consent_at),
            emailDaily: prefs?.email_daily ?? false,
            pushEnabled: prefs?.push_enabled ?? false,
            sendHour: prefs?.send_hour ?? 17,
            marketingConsent: Boolean(bundle.family.marketing_consent_at),
            timezone: bundle.family.timezone,
          }}
          history={lib.unlocked.map((s) => ({ day: s.dayNumber, title: s.title, word: s.wordOfDay, listened: Boolean(progress.get(s.storyId)?.play_count), completed: Boolean(progress.get(s.storyId)?.completed) }))}
        />
    </AppShell>
  );
}
