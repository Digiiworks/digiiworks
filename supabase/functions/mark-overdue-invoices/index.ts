import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("BASE_URL") || "https://digiiworks.lovable.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's date as YYYY-MM-DD (UTC)
    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

    // Find all 'sent' invoices whose due_date has passed (strictly before today)
    const { data: overdueInvoices, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("status", "sent")
      .not("due_date", "is", null)
      .lt("due_date", todayStr);

    if (fetchErr) {
      console.error("Error fetching overdue invoices:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceIds = overdueInvoices.map((i) => i.id);

    // Update only invoices that are still 'sent' (not already paid/cancelled/overdue)
    const { data: updated, error: updateErr } = await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .in("id", invoiceIds)
      .eq("status", "sent")
      .select("id, invoice_number");

    if (updateErr) {
      console.error("Error updating invoices:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Marked ${updated?.length ?? 0} invoices as overdue`);

    return new Response(
      JSON.stringify({ updated: updated?.length ?? 0, invoices: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("mark-overdue error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
