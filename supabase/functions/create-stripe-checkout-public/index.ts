import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");
    const token = url.searchParams.get("token");

    if (!invoiceId || !token) {
      return new Response("Missing invoice_id or token", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return new Response("Stripe is not configured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Verify HMAC token using dedicated secret (falls back to service role key for backward compat)
    const tokenSecret = Deno.env.get("INVOICE_TOKEN_SECRET") || serviceRoleKey;
    const expectedToken = await hmacSign(invoiceId, tokenSecret);
    if (token !== expectedToken) {
      return new Response("Invalid or expired link", {
        status: 403,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit: max 5 checkout sessions per invoice per day
    const dayStart = new Date(new Date().toDateString()).toISOString();
    const rlKey = `checkout:${invoiceId}`;
    const { data: existingRl } = await supabase
      .from("rate_limit_checks")
      .select("count")
      .eq("key", rlKey)
      .eq("window_start", dayStart)
      .single();
    if (existingRl && existingRl.count >= 5) {
      return new Response("Too many checkout attempts. Please try again tomorrow.", {
        status: 429,
        headers: corsHeaders,
      });
    }
    await supabase.from("rate_limit_checks").upsert(
      { key: rlKey, window_start: dayStart, count: (existingRl?.count ?? 0) + 1 },
      { onConflict: "key,window_start" }
    );

    // Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return new Response("Invoice not found", { status: 404, headers: corsHeaders });
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      const baseUrl = Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app";
      return Response.redirect(
        `${baseUrl}/client?payment=already_${invoice.status}&invoice=${invoice.invoice_number}`,
        302
      );
    }

    // Get client email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", invoice.client_id)
      .single();

    // Use currency stored on invoice (denormalized at creation time)
    const currency = invoice.currency || "USD";

    const amountInCents = Math.round(Number(invoice.total) * 100);
    const baseUrl = Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app";

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${baseUrl}/client?payment=success&invoice=${invoice.invoice_number}`);
    params.append("cancel_url", `${baseUrl}/client?payment=cancelled&invoice=${invoice.invoice_number}`);
    params.append("line_items[0][price_data][currency]", currency.toLowerCase());
    params.append("line_items[0][price_data][unit_amount]", String(amountInCents));
    params.append("line_items[0][price_data][product_data][name]", `Invoice ${invoice.invoice_number}`);
    params.append("line_items[0][quantity]", "1");
    if (profile?.email) {
      params.append("customer_email", profile.email);
    }
    params.append("metadata[invoice_id]", invoice.id);
    params.append("metadata[invoice_number]", invoice.invoice_number);
    params.append("metadata[client_id]", invoice.client_id);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error("Stripe error:", errText);
      return new Response("Payment service error. Please try again later.", {
        status: 502,
        headers: corsHeaders,
      });
    }

    const session = await stripeRes.json();

    // Store payment reference
    await supabase
      .from("invoices")
      .update({ payment_reference: session.id })
      .eq("id", invoice.id);

    // Log the checkout session for reconciliation tracking
    await supabase.from("payment_sessions").upsert({
      invoice_id: invoice.id,
      gateway: "stripe",
      session_id: session.id,
      status: "pending",
    }, { onConflict: "session_id" });

    // Redirect to Stripe checkout
    return Response.redirect(session.url, 302);
  } catch (err: any) {
    console.error("Public Stripe checkout error:", err.message);
    return new Response("Something went wrong. Please try again.", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
