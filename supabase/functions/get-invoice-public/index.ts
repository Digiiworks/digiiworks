import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(invoiceId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(invoiceId));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice_id, token } = await req.json();
    if (!invoice_id || !token) {
      return new Response(JSON.stringify({ error: "invoice_id and token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC token
    const tokenSecret = Deno.env.get("INVOICE_TOKEN_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expected = await hmacSign(invoice_id, tokenSecret);
    if (token !== expected) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 10 views per invoice per hour
    const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    const rlKey = `invoice_view:${invoice_id}`;
    const { data: existingRl } = await supabase
      .from("rate_limit_checks")
      .select("count")
      .eq("key", rlKey)
      .eq("window_start", windowStart)
      .single();
    if (existingRl && existingRl.count >= 10) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("rate_limit_checks").upsert(
      { key: rlKey, window_start: windowStart, count: (existingRl?.count ?? 0) + 1 },
      { onConflict: "key,window_start" }
    );

    const [invRes, itemsRes, settingsRes] = await Promise.all([
      supabase.from("invoices").select("id, invoice_number, status, due_date, total, subtotal, tax_rate, notes, created_at, currency, client_id, client_company_id, paid_amount, send_date").eq("id", invoice_id).single(),
      supabase.from("invoice_items").select("id, invoice_id, description, quantity, unit_price, total, product_id").eq("invoice_id", invoice_id),
      supabase.from("page_content").select("content").eq("page_key", "payment_settings").single(),
    ]);

    if (invRes.error || !invRes.data) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice = invRes.data;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, company, currency")
      .eq("user_id", invoice.client_id)
      .single();

    // Use currency stored on invoice (denormalized) — avoids stale data if company is deleted/updated
    const currency = invoice.currency || profile?.currency || "USD";

    return new Response(
      JSON.stringify({
        invoice,
        items: itemsRes.data ?? [],
        client: profile ?? null,
        currency,
        paymentSettings: settingsRes.data?.content ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("get-invoice-public error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
