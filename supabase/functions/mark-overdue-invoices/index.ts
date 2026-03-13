import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    // Find all 'sent' invoices that have an email sent more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get emails that were sent more than 24h ago
    const { data: overdueEmails, error: emailErr } = await supabase
      .from("invoice_emails")
      .select("invoice_id")
      .eq("status", "sent")
      .lt("sent_at", twentyFourHoursAgo);

    if (emailErr) {
      console.error("Error fetching emails:", emailErr);
      return new Response(JSON.stringify({ error: emailErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!overdueEmails || overdueEmails.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceIds = [...new Set(overdueEmails.map((e) => e.invoice_id))];

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
