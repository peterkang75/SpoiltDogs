import type Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());

    // No DB-side effects yet — app reads live from Stripe API for checkout/session data.
    // Log the event type so Railway logs show webhook activity.
    console.log(`[Stripe] Webhook received: ${event.type} (${event.id})`);
    return event;
  }
}
