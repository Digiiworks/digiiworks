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

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const nextMonthFirst = new Date(year, month + 1, 1).toISOString().slice(0, 10);

    // Get all active recurring services grouped by client
    const { data: services, error: svcErr } = await supabase
      .from("client_recurring_services")
      .select("client_id, product_id, quantity, unit_price_override, billing_cycle, start_date")
      .eq("active", true);

    if (svcErr) throw svcErr;
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active recurring services", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by client — billing_cycle and start_date are invoice-level (same for all items of a client)
    const clientMap = new Map<string, { product_id: string; quantity: number; unit_price_override: number | null }[]>();
    const clientBilling = new Map<string, { billing_cycle: string; start_date: string | null }>();

    for (const s of services) {
      // Store billing info from first row per client (all rows share same values)
      if (!clientBilling.has(s.client_id)) {
        clientBilling.set(s.client_id, {
          billing_cycle: s.billing_cycle || 'monthly',
          start_date: s.start_date ?? null,
        });
      }

      const list = clientMap.get(s.client_id) ?? [];
      list.push({ product_id: s.product_id, quantity: s.quantity, unit_price_override: s.unit_price_override });
      clientMap.set(s.client_id, list);
    }

    // Filter clients based on their billing cycle
    const eligibleClients: string[] = [];
    for (const [clientId, billing] of clientBilling) {
      const cycle = billing.billing_cycle;
      const startDate = billing.start_date ? new Date(billing.start_date) : null;

      let shouldInvoice = false;
      if (cycle === 'weekly') {
        shouldInvoice = true;
      } else if (cycle === 'monthly') {
        shouldInvoice = true;
      } else if (cycle === 'quarterly') {
        if (startDate) {
          const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
          shouldInvoice = monthsDiff >= 0 && monthsDiff % 3 === 0;
        } else {
          shouldInvoice = month % 3 === 0;
        }
      } else if (cycle === 'yearly') {
        if (startDate) {
          shouldInvoice = month === startDate.getMonth();
        } else {
          shouldInvoice = month === 0;
        }
      }

      if (shouldInvoice) eligibleClients.push(clientId);
    }

    if (eligibleClients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clients due for invoicing this period", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dedup: check recurring_invoice_runs table (DB-level unique constraint prevents concurrent duplicates)
    const billingMonth = monthStart; // e.g. "2026-03-01"
    const { data: existingRuns } = await supabase
      .from("recurring_invoice_runs")
      .select("client_id")
      .in("client_id", eligibleClients)
      .eq("billing_month", billingMonth);

    const alreadyInvoiced = new Set((existingRuns ?? []).map((r: any) => r.client_id));

    // Get products for pricing
    const allProductIds = [...new Set(services.map(s => s.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price_usd, price_zar, price_thb, description")
      .in("id", allProductIds);

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    // Get client profiles for currency
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, currency, display_name, company")
      .in("user_id", eligibleClients);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const generated: string[] = [];

    for (const clientId of eligibleClients) {
      if (alreadyInvoiced.has(clientId)) continue;

      const items = clientMap.get(clientId);
      if (!items || items.length === 0) continue;

      const profile = profileMap.get(clientId);
      const currency = profile?.currency ?? 'USD';

      // Atomically reserve a run slot — skip on unique constraint violation (concurrent execution)
      const { error: runErr } = await supabase
        .from("recurring_invoice_runs")
        .insert({ client_id: clientId, billing_month: billingMonth });
      if (runErr) {
        console.log(`Skipping ${clientId} — already invoiced this month (concurrent run)`);
        continue;
      }

      // Generate invoice number atomically via DB sequence
      const { data: invoiceNumber, error: numErr } = await supabase.rpc("next_invoice_number");
      if (numErr || !invoiceNumber) {
        console.error(`Failed to generate invoice number for ${clientId}:`, numErr);
        continue;
      }

      // Calculate totals
      let subtotal = 0;
      const lineItems: { description: string; product_id: string; quantity: number; unit_price: number; total: number }[] = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) continue;
        const standardPrice = currency === "ZAR" ? (product.price_zar || product.price_usd) : currency === "THB" ? (product.price_thb || product.price_usd) : product.price_usd;
        const unitPrice = item.unit_price_override ?? standardPrice;
        const total = unitPrice * item.quantity;
        subtotal += total;
        lineItems.push({
          description: product.name + (product.description ? ` - ${product.description}` : ""),
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total,
        });
      }

      if (lineItems.length === 0) continue;

      // Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: clientId,
          invoice_number: invoiceNumber,
          currency,
          status: "draft",
          subtotal,
          tax_rate: 0,
          total: subtotal,
          due_date: nextMonthFirst,
          notes: `Auto-generated recurring invoice for ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
        })
        .select("id")
        .single();

      if (invErr) {
        console.error(`Failed to create invoice for ${clientId}:`, invErr);
        continue;
      }

      // Link the run record to the created invoice
      await supabase
        .from("recurring_invoice_runs")
        .update({ invoice_id: invoice.id })
        .eq("client_id", clientId)
        .eq("billing_month", billingMonth);

      // Insert line items
      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(lineItems.map(li => ({ ...li, invoice_id: invoice.id })));

      if (itemsErr) {
        console.error(`Failed to insert items for invoice ${invoice.id}:`, itemsErr);
      }

      generated.push(`${invoiceNumber} for ${profile?.display_name ?? clientId}`);
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${generated.length} invoice(s)`,
        generated,
        skipped: alreadyInvoiced.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error generating recurring invoices:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
