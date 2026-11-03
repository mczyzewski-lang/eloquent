/**
 * Stripe Billing: abonament ELOFIK PREMIUM (39,90 zł/mies.), zakup prezentu (jednorazowo), Customer Portal, webhooki.
 * W trybie bez kluczy Stripe działa symulacja (demo) z identyczną logiką dostępu.
 */
import Stripe from "stripe";
import { absoluteUrl, config, hasStripe } from "@/lib/config";
import { getDb, nowIso, type FamilyRow, type SubscriptionRow } from "@/lib/db";
import { PRICING } from "@/lib/domain/pricing";
import { getAccess } from "./access";
import { markGiftPaid } from "./gifts";
import { evaluateReferralForFamily } from "./referrals";
import { track } from "./analytics";

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!hasStripe()) throw new Error("Stripe nie jest skonfigurowany");
  if (!stripeClient) stripeClient = new Stripe(config.stripe.secretKey, { maxNetworkRetries: 2, appInfo: { name: "Elofik", url: "https://elofik.com" } });
  return stripeClient;
}

export class AlreadySubscribedError extends Error {}

async function ensureCustomer(family: FamilyRow, email: string): Promise<string> {
  if (family.stripe_customer_id) return family.stripe_customer_id;
  const customer = await stripe().customers.create({ email, metadata: { family_id: family.id } }, { idempotencyKey: `customer-${family.id}` });
  await getDb().update("families", { id: family.id }, { stripe_customer_id: customer.id });
  return customer.id;
}

export async function startSubscriptionCheckout(family: FamilyRow, email: string): Promise<{ url: string; simulated: boolean }> {
  const access = await getAccess(family.id);
  // zabezpieczenie przed podwójną subskrypcją
  const subs = await getDb().find("subscriptions", { family_id: family.id, source: "stripe", status: { in: ["active", "trialing", "past_due", "incomplete"] } });
  if (subs.length || (access.hasAccess && access.source === "stripe")) throw new AlreadySubscribedError("Rodzina ma już aktywny abonament");

  if (!hasStripe()) return { url: `/subskrypcja/symulacja?kind=subscription`, simulated: true };

  const customer = await ensureCustomer(family, email);
  const live = await stripe().subscriptions.list({ customer, status: "all", limit: 10 });
  if (live.data.some((s) => ["active", "trialing", "past_due", "incomplete"].includes(s.status))) throw new AlreadySubscribedError("Aktywny abonament w Stripe");

  const session = await stripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer,
      client_reference_id: family.id,
      line_items: [{ price: config.stripe.pricePremiumMonthly, quantity: 1 }],
      locale: "pl",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      automatic_tax: { enabled: false },
      subscription_data: { metadata: { family_id: family.id } },
      metadata: { family_id: family.id, kind: "subscription" },
      success_url: absoluteUrl("/app?subskrypcja=ok&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: absoluteUrl("/subskrypcja?anulowano=1"),
    },
    { idempotencyKey: `sub-checkout-${family.id}-${new Date().toISOString().slice(0, 13)}` },
  );
  await track("checkout_started", { familyId: family.id, props: { kind: "subscription" } });
  return { url: session.url!, simulated: false };
}

export async function startGiftCheckout(giftId: string, buyerEmail: string): Promise<{ url: string; simulated: boolean }> {
  if (!hasStripe()) return { url: `/subskrypcja/symulacja?kind=gift&gift=${giftId}`, simulated: true };
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: buyerEmail,
      client_reference_id: giftId,
      line_items: config.stripe.priceGiftMonth
        ? [{ price: config.stripe.priceGiftMonth, quantity: 1 }]
        : [{ price_data: { currency: PRICING.currency, unit_amount: PRICING.giftMonthGross, product_data: { name: "Elofik — miesiąc codziennych bajek w prezencie" } }, quantity: 1 }],
      locale: "pl",
      invoice_creation: { enabled: true },
      metadata: { kind: "gift", gift_purchase_id: giftId },
      payment_intent_data: { metadata: { kind: "gift", gift_purchase_id: giftId } },
      success_url: absoluteUrl(`/dla-dziadkow/prezent-kupiony?session_id={CHECKOUT_SESSION_ID}`),
      cancel_url: absoluteUrl("/dla-dziadkow?anulowano=1"),
    },
    { idempotencyKey: `gift-checkout-${giftId}` },
  );
  await getDb().update("gift_purchases", { id: giftId }, { stripe_session_id: session.id });
  return { url: session.url!, simulated: false };
}

export async function createPortalUrl(family: FamilyRow): Promise<string | null> {
  if (!hasStripe() || !family.stripe_customer_id) return null;
  const s = await stripe().billingPortal.sessions.create({ customer: family.stripe_customer_id, return_url: absoluteUrl("/konto"), locale: "pl" });
  return s.url;
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const raw = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return raw ? new Date(raw * 1000).toISOString() : null;
}

function mapStatus(s: Stripe.Subscription.Status): SubscriptionRow["status"] {
  switch (s as string) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "unpaid":
      return s as SubscriptionRow["status"];
    case "incomplete_expired":
      return "expired";
    default:
      return "canceled";
  }
}

export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const db = getDb();
  let familyId: string | undefined = sub.metadata?.family_id;
  if (!familyId) {
    const fam = await db.findOne("families", { stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id });
    familyId = fam?.id;
  }
  if (!familyId) return;
  await db.upsert(
    "subscriptions",
    {
      family_id: familyId,
      source: "stripe",
      stripe_subscription_id: sub.id,
      status: mapStatus(sub.status),
      current_period_end: periodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    ["stripe_subscription_id"],
  );
}

/** Obsługa webhooków (idempotentna — Stripe może wysłać zdarzenie wielokrotnie). */
export async function handleStripeEvent(event: Stripe.Event) {
  const db = getDb();
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.kind === "gift" && s.payment_status === "paid") {
        await markGiftPaid(s.metadata.gift_purchase_id!, s.id, s.amount_total ?? PRICING.giftMonthGross);
      } else if (s.mode === "subscription" && s.subscription) {
        const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
        await syncStripeSubscription(sub);
        await track("subscription_started", { familyId: s.client_reference_id });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncStripeSubscription(sub);
      if (event.type === "customer.subscription.deleted") await track("subscription_canceled", { familyId: sub.metadata?.family_id ?? null });
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const fam = await db.findOne("families", { stripe_customer_id: typeof inv.customer === "string" ? inv.customer : (inv.customer?.id ?? "") });
      if (await db.findOne("payments", { stripe_invoice_id: inv.id! })) break;
      await db.insert("payments", { family_id: fam?.id ?? null, stripe_invoice_id: inv.id!, stripe_session_id: null, kind: "subscription", amount_gross: inv.amount_paid, currency: inv.currency, status: "paid", created_at: nowIso() });
      if (fam && inv.billing_reason === "subscription_create") await evaluateReferralForFamily(fam.id, { firstPaymentSucceeded: true });
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const fam = await db.findOne("families", { stripe_customer_id: typeof inv.customer === "string" ? inv.customer : (inv.customer?.id ?? "") });
      await db.insert("payments", { family_id: fam?.id ?? null, stripe_invoice_id: `${inv.id}-failed-${inv.attempt_count}`, stripe_session_id: null, kind: "subscription", amount_gross: inv.amount_due, currency: inv.currency, status: "failed", created_at: nowIso() });
      // Stripe Smart Retries ponawia płatność; status past_due przychodzi w customer.subscription.updated
      break;
    }
  }
}

/** Demo: symulacja udanej płatności abonamentu (bez Stripe). */
export async function simulateSubscription(familyId: string) {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  await getDb().insert("subscriptions", { family_id: familyId, source: "demo", stripe_subscription_id: null, status: "active", current_period_end: end.toISOString(), cancel_at_period_end: false, created_at: nowIso(), updated_at: nowIso() });
  await getDb().insert("payments", { family_id: familyId, stripe_invoice_id: null, stripe_session_id: `demo-${Date.now()}`, kind: "subscription", amount_gross: PRICING.premiumMonthlyGross, currency: "pln", status: "paid", created_at: nowIso() });
  await track("subscription_started", { familyId, props: { simulated: true } });
  await evaluateReferralForFamily(familyId, { firstPaymentSucceeded: true });
}

/** Demo: anulowanie z końcem okresu. */
export async function simulateCancel(familyId: string) {
  await getDb().update("subscriptions", { family_id: familyId, source: "demo" }, { cancel_at_period_end: true, updated_at: nowIso() });
}
