import type Stripe from "stripe";
import { config, hasStripe } from "@/lib/config";
import { handleStripeEvent, stripe } from "@/lib/services/billing";

/** Webhook Stripe — weryfikacja podpisu, idempotentna obsługa zdarzeń. */
export async function POST(req: Request) {
  if (!hasStripe() || !config.stripe.webhookSecret) return new Response("Stripe not configured", { status: 404 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, config.stripe.webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error("[stripe] handler error", event.type, e);
    return new Response("Handler error", { status: 500 }); // Stripe ponowi
  }
  return new Response("ok");
}
