import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySignature(
  rawBody: string,
  sigHeader: string,
  webhookId: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  // Yoco/Svix signs: "{webhook_id}.{timestamp}.{body}"
  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;

  // Secret is base64-encoded (strip "whsec_" prefix if present)
  const secretBytes = Uint8Array.from(
    atob(secret.startsWith("whsec_") ? secret.slice(6) : secret),
    (c) => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );

  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // sigHeader may contain multiple sigs separated by spaces: "v1,<base64> v1,<base64>"
  const signatures = sigHeader.split(" ");
  return signatures.some((sig) => {
    const parts = sig.split(",");
    if (parts.length < 2) return false;
    return parts[1] === computed;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("YOCO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("YOCO_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();

    // Extract Svix/Yoco signature headers
    const sigHeader = req.headers.get("webhook-signature") || req.headers.get("svix-signature");
    const webhookId = req.headers.get("webhook-id") || req.headers.get("svix-id");
    const timestamp = req.headers.get("webhook-timestamp") || req.headers.get("svix-timestamp");

    if (!sigHeader || !webhookId || !timestamp) {
      console.error("Missing webhook signature headers");
      return new Response(JSON.stringify({ error: "Missing signature headers" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject stale webhooks (older than 5 minutes)
    const tsSeconds = parseInt(timestamp, 10);
    if (isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
      console.error("Webhook timestamp too old or invalid");
      return new Response(JSON.stringify({ error: "Invalid timestamp" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifySignature(rawBody, sigHeader, webhookId, timestamp, webhookSecret);
    if (!valid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Signature verified — parse and process
    const body = JSON.parse(rawBody);
    console.log("Yoco webhook verified:", body.type);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const eventType = body.type;
    const payload = body.payload;

    if (eventType === "payment.succeeded") {
      const checkoutId = payload?.metadata?.checkoutId || payload?.checkoutId;
      const invoiceId = payload?.metadata?.invoice_id;

      let invoice;

      if (invoiceId) {
        const { data } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .single();
        invoice = data;
      }

      if (!invoice && checkoutId) {
        const { data } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("payment_reference", checkoutId)
          .single();
        invoice = data;
      }

      if (invoice && invoice.status !== "paid") {
        await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: "yoco",
            payment_reference: payload?.id || checkoutId,
          })
          .eq("id", invoice.id);

        console.log(`Invoice ${invoice.id} marked as paid via Yoco`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Yoco webhook error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
