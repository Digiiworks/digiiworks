import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events to automatically update invoice status:
 *   - payment_intent.succeeded  → mark invoice paid
 *   - charge.succeeded          → mark invoice paid (fallback)
 *   - charge.failed             → log failed attempt, alert admin
 *   - charge.dispute.created    → flag invoice as disputed
 *   - charge.refunded           → reverse invoice status to sent
 *
 * Requires STRIPE_WEBHOOK_SECRET set in Supabase edge function secrets.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

/** Verify Stripe webhook signature using HMAC-SHA256 */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);

  // Reject events older than 1 minute to prevent replay attacks
  const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (eventAge > 60) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeWebhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook not configured", { status: 503, headers: corsHeaders });
  }

  const sigHeader = req.headers.get("stripe-signature");
  if (!sigHeader) {
    return new Response("Missing stripe-signature header", { status: 400, headers: corsHeaders });
  }

  const rawBody = await req.text();

  const isValid = await verifyStripeSignature(rawBody, sigHeader, stripeWebhookSecret);
  if (!isValid) {
    console.error("Stripe webhook signature verification failed");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const eventType: string = event.type;
  const obj = event.data?.object ?? {};

  console.log(`Stripe webhook received: ${eventType} (id: ${event.id})`);

  try {
    switch (eventType) {
      case "payment_intent.succeeded": {
        const invoiceId = obj.metadata?.invoice_id;
        if (!invoiceId) {
          console.warn("payment_intent.succeeded: no invoice_id in metadata");
          break;
        }
        await markInvoicePaid(supabase, invoiceId, "stripe", obj.id, event.id);
        break;
      }

      case "checkout.session.completed": {
        // Fired when a Stripe Checkout session is completed
        const invoiceId = obj.metadata?.invoice_id;
        const sessionId = obj.id;
        // Update payment session status
        await supabase.from("payment_sessions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("session_id", sessionId);
        if (!invoiceId) {
          console.warn("checkout.session.completed: no invoice_id in metadata, sessionId:", sessionId);
          await markInvoicePaidByReference(supabase, sessionId, "stripe", obj.payment_intent ?? sessionId, event.id);
          break;
        }
        await markInvoicePaid(supabase, invoiceId, "stripe", obj.payment_intent ?? sessionId, event.id);
        break;
      }

      case "charge.succeeded": {
        // Fallback for direct charge flows
        const invoiceId = obj.metadata?.invoice_id;
        if (!invoiceId) break;
        await markInvoicePaid(supabase, invoiceId, "stripe", obj.id, event.id);
        break;
      }

      case "charge.failed": {
        // Mark any pending session for this payment as failed
        if (obj.payment_intent) {
          await supabase.from("payment_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("session_id", obj.payment_intent);
        }
        const invoiceId = obj.metadata?.invoice_id;
        const reason = obj.failure_message ?? obj.outcome?.seller_message ?? "Unknown reason";
        console.warn(`Charge failed for invoice ${invoiceId}: ${reason}`);
        if (invoiceId) {
          await logAuditEvent(supabase, {
            resource_type: "invoice",
            resource_id: invoiceId,
            action: "payment_failed",
            new_values: { gateway: "stripe", charge_id: obj.id, reason, event_id: event.id },
          });
        }
        break;
      }

      case "charge.dispute.created": {
        const invoiceId = obj.metadata?.invoice_id;
        console.warn(`Dispute created for invoice ${invoiceId}, charge ${obj.id}`);
        if (invoiceId) {
          await logAuditEvent(supabase, {
            resource_type: "invoice",
            resource_id: invoiceId,
            action: "payment_disputed",
            new_values: { gateway: "stripe", charge_id: obj.id, amount: obj.amount, event_id: event.id },
          });
        }
        break;
      }

      case "charge.refunded": {
        const invoiceId = obj.metadata?.invoice_id;
        if (!invoiceId) break;

        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .single();

        if (invoice && invoice.status === "paid") {
          await supabase
            .from("invoices")
            .update({ status: "sent", payment_method: null, payment_reference: null, paid_at: null })
            .eq("id", invoiceId);

          await logAuditEvent(supabase, {
            resource_type: "invoice",
            resource_id: invoiceId,
            action: "payment_refunded",
            old_values: { status: "paid" },
            new_values: { status: "sent", gateway: "stripe", charge_id: obj.id, event_id: event.id },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Error processing Stripe event ${eventType}:`, err.message);
    return new Response(JSON.stringify({ error: "Internal error processing event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markInvoicePaid(
  supabase: any,
  invoiceId: string,
  gateway: string,
  paymentRef: string,
  stripeEventId: string
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, status, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    console.error(`Invoice ${invoiceId} not found for payment_intent.succeeded`);
    return;
  }

  if (invoice.status === "paid") {
    console.log(`Invoice ${invoiceId} already marked paid, skipping (idempotent)`);
    return;
  }

  await supabase
    .from("invoices")
    .update({
      status: "paid",
      payment_method: gateway,
      payment_reference: paymentRef,
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  await logAuditEvent(supabase, {
    resource_type: "invoice",
    resource_id: invoiceId,
    action: "payment_succeeded",
    old_values: { status: invoice.status },
    new_values: { status: "paid", gateway, payment_reference: paymentRef, stripe_event_id: stripeEventId },
  });

  console.log(`Invoice ${invoice.invoice_number} (${invoiceId}) marked as paid via ${gateway}`);
}

async function markInvoicePaidByReference(
  supabase: any,
  sessionId: string,
  gateway: string,
  paymentRef: string,
  stripeEventId: string
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, invoice_number")
    .eq("payment_reference", sessionId)
    .single();

  if (!invoice) {
    console.warn(`No invoice found with payment_reference ${sessionId}`);
    return;
  }

  await markInvoicePaid(supabase, invoice.id, gateway, paymentRef, stripeEventId);
}

async function logAuditEvent(
  supabase: any,
  event: {
    resource_type: string;
    resource_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
  }
) {
  try {
    await supabase.from("audit_logs").insert({
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      action: event.action,
      actor_id: null, // system/webhook
      old_values: event.old_values ?? null,
      new_values: event.new_values ?? null,
    });
  } catch (err: any) {
    // Don't fail the webhook if audit logging fails
    console.error("Failed to write audit log:", err.message);
  }
}
