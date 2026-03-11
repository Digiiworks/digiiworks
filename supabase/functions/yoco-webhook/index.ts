import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log("Yoco webhook received:", JSON.stringify(body));

    // Yoco sends webhook events with type and payload
    const eventType = body.type;
    const payload = body.payload;

    if (eventType === "payment.succeeded") {
      const checkoutId = payload?.metadata?.checkoutId || payload?.checkoutId;
      const invoiceId = payload?.metadata?.invoice_id;

      // Try to find the invoice by payment_reference (checkout ID) or metadata
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
    console.error("Yoco webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
