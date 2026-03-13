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
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expected = await hmacSign(invoice_id, secret);
    if (token !== expected) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secret
    );

    const [invRes, itemsRes, settingsRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoice_id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", invoice_id),
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

    let currency = profile?.currency || "USD";
    if (invoice.client_company_id) {
      const { data: co } = await supabase
        .from("client_companies")
        .select("currency")
        .eq("id", invoice.client_company_id)
        .single();
      if (co?.currency) currency = co.currency;
    }

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
