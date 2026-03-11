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

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const nextMonthFirst = new Date(year, month + 1, 1).toISOString().slice(0, 10);

    // Get all active recurring services grouped by client
    const { data: services, error: svcErr } = await supabase
      .from("client_recurring_services")
      .select("client_id, product_id, quantity")
      .eq("active", true);

    if (svcErr) throw svcErr;
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active recurring services", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by client
    const clientMap = new Map<string, { product_id: string; quantity: number }[]>();
    for (const s of services) {
      const list = clientMap.get(s.client_id) ?? [];
      list.push({ product_id: s.product_id, quantity: s.quantity });
      clientMap.set(s.client_id, list);
    }

    const clientIds = Array.from(clientMap.keys());

    // Check existing invoices for this month for these clients
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("created_at", `${monthStart}T00:00:00Z`)
      .lte("created_at", `${monthEnd}T23:59:59Z`);

    const alreadyInvoiced = new Set((existingInvoices ?? []).map((i: any) => i.client_id));

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
      .in("user_id", clientIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    // Get latest invoice number
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(1);

    let lastNum = 0;
    if (lastInvoice && lastInvoice.length > 0) {
      const match = lastInvoice[0].invoice_number.match(/(\d+)$/);
      if (match) lastNum = parseInt(match[1]);
    }

    const generated: string[] = [];

    for (const [clientId, items] of clientMap) {
      if (alreadyInvoiced.has(clientId)) continue;

      const profile = profileMap.get(clientId);
      lastNum++;
      const invoiceNumber = `INV-${String(lastNum).padStart(4, "0")}`;

      // Calculate totals
      let subtotal = 0;
      const lineItems: { description: string; product_id: string; quantity: number; unit_price: number; total: number }[] = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) continue;
        const currency = profile?.currency ?? "USD";
        const unitPrice = currency === "ZAR" ? (product.price_zar || product.price_usd) : currency === "THB" ? (product.price_thb || product.price_usd) : product.price_usd;
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
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
