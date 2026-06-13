import Stripe from "stripe";

import { requireEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe webhook payload.";

    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id ?? session.client_reference_id;

    if (!userId) {
      return Response.json(
        { error: "Checkout session is missing user metadata." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
      })
      .eq("id", userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
