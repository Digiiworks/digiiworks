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
    const nextMonthFirst = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    // send_date = today so the daily email cron picks up and sends these drafts
    const sendDate = now.toISOString().slice(0, 10);

    // FIX A: select client_company_id so we can link invoices to the right company
    const { data: services, error: svcErr } = await supabase
      .from("client_recurring_services")
      .select("client_id, client_company_id, product_id, quantity, unit_price_override, billing_cycle, start_date")
      .eq("active", true);

    if (svcErr) throw svcErr;
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active recurring services", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX A: Group by (client_company_id ?? client_id) so each company gets its own invoice
    type GroupEntry = {
      client_id: string;
      client_company_id: string | null;
      items: { product_id: string; quantity: number; unit_price_override: number | null }[];
      billing_cycle: string;
      start_date: string | null;
    };
    const groupMap = new Map<string, GroupEntry>();

    for (const s of services) {
      const groupKey = s.client_company_id ?? s.client_id;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          client_id: s.client_id,
          client_company_id: s.client_company_id ?? null,
          items: [],
          billing_cycle: s.billing_cycle || "monthly",
          start_date: s.start_date ?? null,
        });
      }
      groupMap.get(groupKey)!.items.push({
        product_id: s.product_id,
        quantity: s.quantity,
        unit_price_override: s.unit_price_override,
      });
    }

    // Filter groups based on their billing cycle
    const eligibleGroups: GroupEntry[] = [];
    for (const [, group] of groupMap) {
      const cycle = group.billing_cycle;
      const startDate = group.start_date ? new Date(group.start_date) : null;

      let shouldInvoice = false;
      if (cycle === "weekly" || cycle === "monthly") {
        shouldInvoice = true;
      } else if (cycle === "quarterly") {
        if (startDate) {
          const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
          shouldInvoice = monthsDiff >= 0 && monthsDiff % 3 === 0;
        } else {
          shouldInvoice = month % 3 === 0;
        }
      } else if (cycle === "yearly") {
        shouldInvoice = startDate ? month === startDate.getMonth() : month === 0;
      }

      if (shouldInvoice) eligibleGroups.push(group);
    }

    if (eligibleGroups.length === 0) {
      return new Response(
        JSON.stringify({ message: "No clients due for invoicing this period", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billingMonth = monthStart;
    const eligibleClientIds = [...new Set(eligibleGroups.map(g => g.client_id))];

    // Dedup: check existing runs (supports both legacy and company-level uniqueness)
    const { data: existingRuns } = await supabase
      .from("recurring_invoice_runs")
      .select("client_id, client_company_id")
      .in("client_id", eligibleClientIds)
      .eq("billing_month", billingMonth);

    const alreadyInvoiced = new Set(
      (existingRuns ?? []).map((r: any) => `${r.client_id}:${r.client_company_id ?? ""}`)
    );

    // Get products for pricing
    const allProductIds = [...new Set(services.map(s => s.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price_usd, price_zar, price_thb, description")
      .in("id", allProductIds);
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    // FIX A+B: Fetch client companies for currency AND default_tax_rate
    const companyIds = eligibleGroups
      .map(g => g.client_company_id)
      .filter((id): id is string => id !== null);

    const { data: companies } = await supabase
      .from("client_companies")
      .select("id, currency, default_tax_rate, company_name")
      .in("id", companyIds);
    const companyMap = new Map((companies ?? []).map((c: any) => [c.id, c]));

    // Fallback: fetch profiles for groups without a company
    const profileClientIds = eligibleGroups
      .filter(g => !g.client_company_id)
      .map(g => g.client_id);
    const { data: profiles } = profileClientIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, currency, display_name")
          .in("user_id", profileClientIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const generated: string[] = [];

    for (const group of eligibleGroups) {
      const dedupeKey = `${group.client_id}:${group.client_company_id ?? ""}`;
      if (alreadyInvoiced.has(dedupeKey)) continue;

      if (!group.items || group.items.length === 0) continue;

      // FIX A: Resolve currency and tax rate from company (or profile fallback)
      const company = group.client_company_id ? companyMap.get(group.client_company_id) : null;
      const profile = profileMap.get(group.client_id);
      const currency = company?.currency ?? profile?.currency ?? "USD";
      // FIX B: Use company's default_tax_rate (falls back to 0 if column doesn't exist yet)
      const taxRate: number = Number(company?.default_tax_rate ?? 0);

      // Atomically reserve a run slot
      const { error: runErr } = await supabase
        .from("recurring_invoice_runs")
        .insert({
          client_id: group.client_id,
          client_company_id: group.client_company_id ?? null,
          billing_month: billingMonth,
        });
      if (runErr) {
        console.log(`Skipping ${dedupeKey} — already invoiced this month (concurrent run)`);
        continue;
      }

      // Generate invoice number atomically
      const { data: invoiceNumber, error: numErr } = await supabase.rpc("next_invoice_number");
      if (numErr || !invoiceNumber) {
        console.error(`Failed to generate invoice number for ${dedupeKey}:`, numErr);
        continue;
      }

      // Calculate line item totals
      let subtotalCents = 0;
      const lineItems: {
        description: string; product_id: string; quantity: number; unit_price: number; total: number;
      }[] = [];

      for (const item of group.items) {
        const product = productMap.get(item.product_id);
        if (!product) continue;
        const standardPrice =
          currency === "ZAR" ? (product.price_zar || product.price_usd) :
          currency === "THB" ? (product.price_thb || product.price_usd) :
          product.price_usd;
        const unitPrice = item.unit_price_override ?? standardPrice;
        const itemTotal = unitPrice * item.quantity;
        subtotalCents += Math.round(itemTotal * 100);
        lineItems.push({
          description: product.name + (product.description ? ` - ${product.description}` : ""),
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total: itemTotal,
        });
      }

      if (lineItems.length === 0) continue;

      const subtotal = subtotalCents / 100;
      // FIX B: Apply company default tax rate
      const taxCents = Math.round((subtotalCents * taxRate) / 100);
      const total = (subtotalCents + taxCents) / 100;

      const clientName = company?.company_name ?? profile?.display_name ?? group.client_id;

      // FIX A: Include client_company_id in invoice INSERT
      // FIX D: Set send_date = today so daily email cron auto-sends this draft
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: group.client_id,
          client_company_id: group.client_company_id ?? null,
          invoice_number: invoiceNumber,
          currency,
          status: "draft",
          subtotal,
          // FIX B: Store actual tax rate (not hardcoded 0)
          tax_rate: taxRate,
          total,
          due_date: nextMonthFirst,
          // FIX D: Set send_date so the email cron picks this up automatically
          send_date: sendDate,
          notes: `Auto-generated recurring invoice for ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
        })
        .select("id")
        .single();

      if (invErr) {
        console.error(`Failed to create invoice for ${dedupeKey}:`, invErr);
        continue;
      }

      // Link run record to invoice
      await supabase
        .from("recurring_invoice_runs")
        .update({ invoice_id: invoice.id })
        .eq("client_id", group.client_id)
        .eq("billing_month", billingMonth);

      // Insert line items
      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(lineItems.map(li => ({ ...li, invoice_id: invoice.id })));

      if (itemsErr) {
        console.error(`Failed to insert items for invoice ${invoice.id}:`, itemsErr);
      }

      generated.push(`${invoiceNumber} for ${clientName}`);
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${generated.length} invoice(s)`,
        generated,
        skipped: eligibleGroups.length - generated.length,
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
