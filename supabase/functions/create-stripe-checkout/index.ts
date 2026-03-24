import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Validate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice - user must own it
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .eq("client_id", user.id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: `Invoice is already ${invoice.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", user.id)
      .single();

    // Use currency stored on invoice (denormalized at creation time)
    const currency = invoice.currency || "USD";

    // Amount in cents for Stripe
    const amountInCents = Math.round(Number(invoice.total) * 100);
    const baseUrl = Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app";

    // Create Stripe Checkout Session via API
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${baseUrl}/dashboard?payment=success&invoice=${invoice.invoice_number}`);
    params.append("cancel_url", `${baseUrl}/dashboard?payment=cancelled&invoice=${invoice.invoice_number}`);
    params.append("line_items[0][price_data][currency]", currency.toLowerCase());
    params.append("line_items[0][price_data][unit_amount]", String(amountInCents));
    params.append("line_items[0][price_data][product_data][name]", `Invoice ${invoice.invoice_number}`);
    params.append("line_items[0][quantity]", "1");
    if (profile?.email) {
      params.append("customer_email", profile.email);
    }
    params.append("metadata[invoice_id]", invoice.id);
    params.append("metadata[invoice_number]", invoice.invoice_number);
    params.append("metadata[client_id]", user.id);

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
      throw new Error(`Stripe API error [${stripeRes.status}]: ${errText}`);
    }

    const session = await stripeRes.json();

    // Store the session ID on the invoice for webhook reconciliation
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

    return new Response(
      JSON.stringify({ redirectUrl: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
