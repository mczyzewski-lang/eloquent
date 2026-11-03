import { config, hasStripe } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import { qualifyReferral, rewardsDue, REFERRAL_TIERS } from "@/lib/domain/referral";
import { track } from "./analytics";

/** Wywoływane po pierwszej opłaconej fakturze rodziny polecanej. */
export async function evaluateReferralForFamily(refereeFamilyId: string, opts: { firstPaymentSucceeded: boolean; cardFingerprint?: string | null }) {
  const db = getDb();
  const referee = await db.findOne("families", { id: refereeFamilyId });
  if (!referee?.referred_by_code) return null;
  const referrer = await db.findOne("families", { referral_code: referee.referred_by_code });
  if (!referrer) return null;
  if (await db.findOne("referrals", { referee_family_id: refereeFamilyId })) return null; // już rozpatrzone
  const [referrerUser, refereeUser] = await Promise.all([db.findOne("users", { id: referrer.owner_user_id }), db.findOne("users", { id: referee.owner_user_id })]);
  const previousPayments = await db.count("payments", { family_id: refereeFamilyId, status: "paid" });
  const result = qualifyReferral({
    referrerFamilyId: referrer.id,
    referrerEmail: referrerUser?.email ?? "",
    refereeFamilyId,
    refereeEmail: refereeUser?.email ?? "",
    refereeFirstPaymentSucceeded: opts.firstPaymentSucceeded,
    refereeWasCustomerBefore: previousPayments > 1,
  });
  await db.insert("referrals", {
    referrer_family_id: referrer.id,
    referee_family_id: refereeFamilyId,
    status: result.qualified ? "qualified" : "rejected",
    reason: result.qualified ? null : result.reason,
    qualified_at: result.qualified ? nowIso() : null,
    created_at: nowIso(),
  });
  if (!result.qualified) return result;
  await track("referral_qualified", { familyId: referrer.id });
  await grantDueRewards(referrer.id);
  return result;
}

export async function grantDueRewards(familyId: string) {
  const db = getDb();
  const qualified = await db.count("referrals", { referrer_family_id: familyId, status: "qualified" });
  const granted = (await db.find("referral_rewards", { family_id: familyId })).map((r) => r.reward);
  for (const reward of rewardsDue(qualified, granted)) {
    await db.insert("referral_rewards", { family_id: familyId, reward, granted_at: nowIso() });
    if (reward === "free_month") await grantFreeMonth(familyId);
  }
}

async function grantFreeMonth(familyId: string) {
  const db = getDb();
  const stripeSub = (await db.find("subscriptions", { family_id: familyId, source: "stripe", status: { in: ["active", "trialing"] } }))[0];
  if (stripeSub?.stripe_subscription_id && hasStripe() && config.stripe.couponReferralMonth) {
    const { stripe } = await import("./billing");
    await stripe().subscriptions.update(stripeSub.stripe_subscription_id, { discounts: [{ coupon: config.stripe.couponReferralMonth }] });
    return;
  }
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  await db.insert("subscriptions", { family_id: familyId, source: "referral", stripe_subscription_id: null, status: "active", current_period_end: end.toISOString(), cancel_at_period_end: true, created_at: nowIso(), updated_at: nowIso() });
}

export async function referralSummary(familyId: string) {
  const db = getDb();
  const qualified = await db.count("referrals", { referrer_family_id: familyId, status: "qualified" });
  const pending = await db.count("families", { referred_by_code: (await db.findOne("families", { id: familyId }))?.referral_code ?? "__none__" });
  const rewards = await db.find("referral_rewards", { family_id: familyId });
  return { qualified, signups: pending, rewards, tiers: REFERRAL_TIERS };
}
