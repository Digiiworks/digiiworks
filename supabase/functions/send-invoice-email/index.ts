import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

function normalizeCurrency(currency?: string) {
  return (currency || 'USD').toString().trim().toUpperCase();
}

function currencySymbol(currency: string) {
  const code = normalizeCurrency(currency);
  return code === 'ZAR' ? 'R' : code === 'THB' ? '฿' : '$';
}

function hasAnyBankField(bankInfo: any) {
  if (!bankInfo || typeof bankInfo !== 'object') return false;

  return Boolean(
    bankInfo.bank_name ||
      bankInfo.account_name ||
      bankInfo.account_number ||
      bankInfo.swift_code ||
      bankInfo.routing_number ||
      bankInfo.branch_code ||
      bankInfo.branch ||
      bankInfo.account_type ||
      bankInfo.reference_note ||
      bankInfo.currency
  );
}

function firstRegionObject(settings: any, keys: string[]) {
  for (const key of keys) {
    if (settings?.[key] && typeof settings[key] === 'object') return settings[key];
  }
  return null;
}

function resolveRegionalBankInfo(paymentSettings: any, currency: string) {
  const code = normalizeCurrency(currency);

  const regionMap = code === 'ZAR'
    ? { label: 'South Africa', keys: ['south_africa', 'southAfrica', 'south-africa', 'za'] }
    : code === 'THB'
      ? { label: 'Thailand', keys: ['thai', 'thailand', 'th'] }
      : { label: 'International', keys: ['global', 'international', 'usd'] };

  const regional = firstRegionObject(paymentSettings, regionMap.keys);
  if (regional && hasAnyBankField(regional)) {
    return { bankInfo: regional, regionLabel: regionMap.label };
  }

  const fallbackOrder = [
    { label: 'International', keys: ['global', 'international', 'usd'] },
    { label: 'Thailand', keys: ['thai', 'thailand', 'th'] },
    { label: 'South Africa', keys: ['south_africa', 'southAfrica', 'south-africa', 'za'] },
  ];

  for (const region of fallbackOrder) {
    const info = firstRegionObject(paymentSettings, region.keys);
    if (info && hasAnyBankField(info)) {
      return { bankInfo: info, regionLabel: region.label };
    }
  }

  if (regional) {
    return { bankInfo: regional, regionLabel: regionMap.label };
  }

  return null;
}

function buildBankingHTML(bankInfo: any, paymentLinks: any, currency: string, invoiceTotal?: number, paymentMethods?: any, regionLabel?: string, stripeCheckoutUrl?: string) {
  const safeBankInfo = bankInfo && typeof bankInfo === 'object' ? bankInfo : {};

  const fields: string[] = [];
  if (safeBankInfo.bank_name) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;width:130px;">Bank</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.bank_name + '</td></tr>');
  if (safeBankInfo.account_name) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Account Name</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.account_name + '</td></tr>');
  if (safeBankInfo.account_number) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Account / IBAN</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.account_number + '</td></tr>');
  if (safeBankInfo.swift_code) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">SWIFT</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.swift_code + '</td></tr>');
  if (safeBankInfo.routing_number) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Routing Number</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.routing_number + '</td></tr>');
  if (safeBankInfo.branch_code) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Branch Code</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.branch_code + '</td></tr>');
  if (safeBankInfo.branch) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Branch</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.branch + '</td></tr>');
  if (safeBankInfo.account_type) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Type</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.account_type + '</td></tr>');
  if (safeBankInfo.currency) fields.push('<tr><td style="padding:3px 0;color:#6b7280;font-size:13px;">Currency</td><td style="padding:3px 0;color:#111827;font-size:13px;font-weight:600;">' + safeBankInfo.currency + '</td></tr>');

  const resolvedRegionLabel = regionLabel || (currency === 'ZAR' ? 'South Africa' : currency === 'THB' ? 'Thailand' : 'International');

  const buttonRows: string[] = [];

  const stripeEnabled = paymentMethods?.stripe_enabled === true || paymentMethods?.stripe_enabled === 'true';
  if (stripeEnabled && stripeCheckoutUrl) {
    buttonRows.push(
      '<tr><td style="padding:0 0 10px;"><a href="' + stripeCheckoutUrl + '" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#635bff;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">Pay with Stripe</a></td></tr>'
    );
  }

  const yocoEnabled = paymentMethods?.yoco_enabled === true || paymentMethods?.yoco_enabled === 'true' || paymentMethods?.yoco_enabled === undefined;
  const normalizedCurrency = normalizeCurrency(currency);
  if (yocoEnabled && paymentLinks?.yoco_payment_link && normalizedCurrency === 'ZAR') {
    const yocoUrl = paymentLinks.yoco_payment_link + (paymentLinks.yoco_payment_link.includes('?') ? '&' : '?') + 'amount=' + Number(invoiceTotal || 0).toFixed(2);
    buttonRows.push(
      '<tr><td style="padding:0 0 10px;"><a href="' + yocoUrl + '" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">Pay with Yoco</a></td></tr>'
    );
  }

  if (paymentLinks?.wise_payment_link) {
    buttonRows.push(
      '<tr><td style="padding:0;"><a href="' + paymentLinks.wise_payment_link + '" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#9fe870;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">Pay with Wise</a></td></tr>'
    );
  }

  if (fields.length === 0 && buttonRows.length > 0) {
    fields.push('<tr><td colspan="2" style="padding:4px 0 2px;color:#6b7280;font-size:12px;">Local bank details are still being configured. You can use the online payment options below.</td></tr>');
  }

  if (fields.length === 0 && buttonRows.length === 0) return '';

  const refNote = safeBankInfo.reference_note
    ? '<p style="margin:12px 0 0;font-size:12px;color:#6b7280;font-style:italic;">' + safeBankInfo.reference_note + '</p>'
    : '';

  const directDepositCard = '<div style="margin-top:28px;padding:20px 24px;background:#f0fdfa;border-radius:10px;border:1px solid #ccfbf1;">' +
    '<p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:#0d9488;font-weight:700;">Direct Deposit — ' + resolvedRegionLabel + '</p>' +
    '<table style="width:100%;border-collapse:collapse;">' + fields.join('') + '</table>' +
    refNote +
    '</div>';

  const linksHTML = buttonRows.length > 0
    ? '<div style="text-align:center;margin:20px 0 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:360px;margin:0 auto;border-collapse:collapse;">' + buttonRows.join('') + '</table>' +
      (paymentLinks?.wise_payment_link
        ? '<p style="margin:10px 0 0;font-size:11px;color:#9ca3af;">Don\'t have a Wise account? <a href="https://wise.com/invite/dic/justind507" style="color:#0d9488;text-decoration:underline;">Sign up today</a> for fee-free transfers.</p>'
        : '') +
      '</div>'
    : '';

  return directDepositCard + linksHTML;
}

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

function buildEmailHTML(invoice: any, items: InvoiceItem[], client: any, dashboardUrl: string, currency: string, pdfToken: string, paymentSettings?: any, stripeCheckoutUrl?: string) {
  const normalizedCurrency = normalizeCurrency(currency);
  const sym = currencySymbol(normalizedCurrency);

  const itemRows = items.map(function (it) {
    return '<tr>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">' + it.description + '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;text-align:center;">' + it.quantity + '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;font-family:Courier New,monospace;">' + sym + Number(it.unit_price).toFixed(2) + '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;text-align:right;font-weight:600;font-family:Courier New,monospace;">' + sym + Number(it.total).toFixed(2) + '</td>' +
      '</tr>';
  }).join("");

  const taxAmount = Number(invoice.subtotal) * (Number(invoice.tax_rate) / 100);
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "On receipt";

  const statusColor = invoice.status === 'overdue' ? '#ef4444' : invoice.status === 'paid' ? '#10b981' : '#0891b2';
  const statusLabel = invoice.status === 'overdue' ? 'OVERDUE' : invoice.status === 'paid' ? 'PAID' : 'AWAITING PAYMENT';

  const companyLine = client.company
    ? '<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">' + client.company + '</p>'
    : '';

  const notesBlock = invoice.notes
    ? '<tr><td style="padding:24px 32px 0;"><div style="padding:14px 18px;background:#f0f9ff;border-radius:8px;border-left:3px solid #0891b2;"><p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">' + invoice.notes + '</p></div></td></tr>'
    : '';

  const taxRow = Number(invoice.tax_rate) > 0
    ? '<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Tax (' + invoice.tax_rate + '%)</td><td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;font-family:Courier New,monospace;">' + sym + taxAmount.toFixed(2) + '</td></tr>'
    : '';

  let bankingBlock = '';
  if (paymentSettings) {
    const resolved = resolveRegionalBankInfo(paymentSettings, normalizedCurrency);
    bankingBlock = buildBankingHTML(
      resolved?.bankInfo,
      paymentSettings.payment_links,
      normalizedCurrency,
      invoice.total,
      paymentSettings.payment_methods,
      resolved?.regionLabel,
      stripeCheckoutUrl,
    );
  }

  return '<!DOCTYPE html>' +
'<html>' +
'<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">' +
'<title>Invoice ' + invoice.invoice_number + '</title></head>' +
'<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +

'<div style="display:none;max-height:0;overflow:hidden;">Invoice ' + invoice.invoice_number + ' — ' + sym + Number(invoice.total).toFixed(2) + ' due ' + dueDate + '</div>' +

'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">' +
'<tr><td align="center" style="padding:0;">' +
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">' +

// Header
'<tr><td style="background:#0a0a0a;padding:28px 32px;text-align:center;">' +
'<img src="https://digiiworks.lovable.app/logo.svg" alt="Digiiworks" width="175" style="display:inline-block;width:175px;height:auto;" />' +
'<p style="margin:10px 0 0;font-size:10px;color:#9ca3af;letter-spacing:4px;text-transform:uppercase;">Digital Agency</p>' +
'</td></tr>' +

// Gradient line
'<tr><td style="height:3px;background:#0891b2;font-size:0;line-height:0;">&nbsp;</td></tr>' +

// Invoice meta
'<tr><td style="padding:32px 32px 0;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
'<tr>' +
'<td style="vertical-align:top;">' +
'<p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;font-weight:600;">Invoice</p>' +
'<p style="margin:0;font-size:24px;font-weight:800;color:#111827;font-family:Courier New,monospace;letter-spacing:1px;">' + invoice.invoice_number + '</p>' +
'</td>' +
'<td style="text-align:right;vertical-align:top;">' +
'<p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;font-weight:600;">Due Date</p>' +
'<p style="margin:0;font-size:16px;color:#111827;font-weight:600;">' + dueDate + '</p>' +
'<span style="display:inline-block;margin-top:8px;padding:4px 12px;background:' + statusColor + ';color:#ffffff;font-size:10px;font-weight:700;letter-spacing:1.5px;border-radius:20px;text-transform:uppercase;">' + statusLabel + '</span>' +
'</td>' +
'</tr></table></td></tr>' +

// Billed To
'<tr><td style="padding:24px 32px 0;">' +
'<div style="background:#f9fafb;border-radius:10px;padding:18px 20px;border:1px solid #f3f4f6;">' +
'<p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;font-weight:600;">Billed To</p>' +
'<p style="margin:0;font-size:16px;color:#111827;font-weight:700;">' + (client.display_name || client.email) + '</p>' +
'<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">' + client.email + '</p>' +
companyLine +
'</div></td></tr>' +

// Items table
'<tr><td style="padding:28px 32px 0;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
'<thead><tr>' +
'<th style="padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#0891b2;font-weight:700;border-bottom:2px solid #0891b2;">Item</th>' +
'<th style="padding:10px 16px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#0891b2;font-weight:700;border-bottom:2px solid #0891b2;">Qty</th>' +
'<th style="padding:10px 16px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#0891b2;font-weight:700;border-bottom:2px solid #0891b2;">Price</th>' +
'<th style="padding:10px 16px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#0891b2;font-weight:700;border-bottom:2px solid #0891b2;">Total</th>' +
'</tr></thead>' +
'<tbody>' + itemRows + '</tbody>' +
'</table></td></tr>' +

// Totals
'<tr><td style="padding:20px 32px 0;">' +
'<table role="presentation" width="240" cellpadding="0" cellspacing="0" style="margin-left:auto;">' +
'<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;font-family:Courier New,monospace;">' + sym + Number(invoice.subtotal).toFixed(2) + '</td></tr>' +
taxRow +
'<tr><td style="padding:12px 0 0;font-size:18px;font-weight:800;color:#111827;border-top:2px solid #e5e7eb;">Total</td>' +
'<td style="padding:12px 0 0;font-size:20px;font-weight:800;color:#0891b2;text-align:right;font-family:Courier New,monospace;border-top:2px solid #e5e7eb;">' + sym + Number(invoice.total).toFixed(2) + '</td></tr>' +
'</table></td></tr>' +

// Notes
notesBlock +

// CTA buttons — stacked, full-width, matching payment button style
'<tr><td style="padding:32px 32px 0;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:360px;margin:0 auto;border-collapse:collapse;">' +
'<tr><td style="padding:0 0 10px;"><a href="' + dashboardUrl + '" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#0a0a0a;color:#00e5ff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">&#9654;&#xFE0E; View &amp; Pay Invoice</a></td></tr>' +
'<tr><td style="padding:0;"><a href="https://digiiworks.lovable.app/invoice/' + invoice.id + '?token=' + pdfToken + '" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#ffffff;color:#0891b2;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;border:2px solid #e5e7eb;">&#8681;&#xFE0E; Download PDF</a></td></tr>' +
'</table>' +
'</td></tr>' +

// Banking
'<tr><td style="padding:8px 32px 0;">' + bankingBlock + '</td></tr>' +

// Footer
'<tr><td style="padding:40px 32px 32px;text-align:center;">' +
'<p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ' + new Date().getFullYear() + ' DigiiWorks. All rights reserved.</p>' +
'<p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">This invoice was generated by DigiiWorks billing.</p>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
}

async function sendEmail(to: string, subject: string, html: string) {
  const smtpHost = Deno.env.get("SMTP_HOST")!.trim();
  const smtpUser = Deno.env.get("SMTP_USER")!.trim();
  const smtpPass = Deno.env.get("SMTP_PASS")!.trim();

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: '"DigiiWorks Billing" <' + smtpUser + '>',
    to,
    subject,
    text: "Please view this email in an HTML-capable client.",
    html,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { invoice_id, mode, force_resend } = body;

    const dashboardBaseUrl = "https://digiiworks.lovable.app/dashboard";
    const results: { invoice_id: string; status: string; error?: string }[] = [];

    // Fetch payment settings once
    const { data: settingsRow } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_key", "payment_settings")
      .single();
    const paymentSettings = settingsRow?.content as any ?? null;

    // Test mode: generate a mock invoice with real products
    if (mode === "test") {
      const { currency, send_to } = body;
      if (!send_to) throw new Error("send_to email required for test mode");

      const testCurrency = currency || 'USD';

      const { data: products } = await supabase
        .from("products")
        .select("name, price_usd, price_zar, price_thb")
        .eq("active", true)
        .limit(4);

      const testLineAmount = 5;

      const items: InvoiceItem[] = (products || []).map((p: any) => ({
        description: p.name,
        quantity: 1,
        unit_price: testLineAmount,
        total: testLineAmount,
      }));

      if (items.length === 0) {
        items.push({ description: "Sample Service", quantity: 1, unit_price: testLineAmount, total: testLineAmount });
      }

      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const taxRate = testCurrency === 'ZAR' ? 15 : testCurrency === 'THB' ? 7 : 0;
      const total = subtotal + subtotal * (taxRate / 100);

      const mockInvoice = {
        invoice_number: "TEST-0001",
        status: "sent",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        subtotal,
        tax_rate: taxRate,
        total,
        notes: "This is a test invoice email — no payment required.",
      };

      const mockClient = {
        display_name: "Test Client",
        email: send_to,
        company: "Test Company",
      };

      const testToken = await hmacSign("test-invoice-id", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const testStripeUrl = `${supabaseUrl}/functions/v1/create-stripe-checkout-public?invoice_id=test-invoice-id&token=${testToken}`;
      const html = buildEmailHTML(mockInvoice, items, mockClient, dashboardBaseUrl, testCurrency, testToken, paymentSettings, testStripeUrl);
      await sendEmail(send_to, "[TEST] Invoice TEST-0001 from DigiiWorks (" + testCurrency + ")", html);

      return new Response(
        JSON.stringify({ success: true, sent_to: send_to, currency: testCurrency }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "scheduled") {
      const today = new Date().toISOString().split("T")[0];
      const { data: invoices, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .in("status", ["draft", "sent"])
        .lte("send_date", today);

      if (invErr) throw invErr;

      for (const inv of invoices || []) {
        if (!force_resend) {
          const { data: existing } = await supabase
            .from("invoice_emails")
            .select("id")
            .eq("invoice_id", inv.id)
            .eq("status", "sent")
            .limit(1);
          if (existing && existing.length > 0) continue;
        }

        try {
          const { data: client } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", inv.client_id)
            .single();
          if (!client?.email) throw new Error("No client email");

          let companyCurrency = 'USD';
          if (inv.client_company_id) {
            const { data: company } = await supabase
              .from("client_companies")
              .select("currency")
              .eq("id", inv.client_company_id)
              .single();
            if (company?.currency) companyCurrency = company.currency;
          }

          const { data: items } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", inv.id);

          const pdfToken = await hmacSign(inv.id, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const stripeToken = await hmacSign(inv.id, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const stripeUrl = `${supabaseUrl}/functions/v1/create-stripe-checkout-public?invoice_id=${inv.id}&token=${stripeToken}`;
          const html = buildEmailHTML(inv, items || [], client, dashboardBaseUrl, companyCurrency, pdfToken, paymentSettings, stripeUrl);
          await sendEmail(client.email, "Invoice " + inv.invoice_number + " from DigiiWorks", html);

          await supabase.from("invoice_emails").insert({
            invoice_id: inv.id,
            sent_to: client.email,
            sent_at: new Date().toISOString(),
            scheduled_for: inv.send_date,
            status: "sent",
          });

          if (inv.status === "draft") {
            await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id);
          }

          results.push({ invoice_id: inv.id, status: "sent" });
        } catch (err: any) {
          await supabase.from("invoice_emails").insert({
            invoice_id: inv.id,
            sent_to: "unknown",
            status: "failed",
            error: err.message,
          });
          results.push({ invoice_id: inv.id, status: "failed", error: err.message });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual send for a single invoice
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");

    const { data: client } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", invoice.client_id)
      .single();
    if (!client?.email) throw new Error("Client has no email address");

    let companyCurrency = 'USD';
    if (invoice.client_company_id) {
      const { data: company } = await supabase
        .from("client_companies")
        .select("currency")
        .eq("id", invoice.client_company_id)
        .single();
      if (company?.currency) companyCurrency = company.currency;
    }

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id);

    const pdfToken = await hmacSign(invoice_id, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripeToken = await hmacSign(invoice_id, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripeUrl = `${supabaseUrl}/functions/v1/create-stripe-checkout-public?invoice_id=${invoice_id}&token=${stripeToken}`;
    const html = buildEmailHTML(invoice, items || [], client, dashboardBaseUrl, companyCurrency, pdfToken, paymentSettings, stripeUrl);
    await sendEmail(client.email, "Invoice " + invoice.invoice_number + " from DigiiWorks", html);

    await supabase.from("invoice_emails").insert({
      invoice_id: invoice.id,
      sent_to: client.email,
      sent_at: new Date().toISOString(),
      status: "sent",
    });

    if (invoice.status === "draft") {
      await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id);
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: client.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.invoice_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        await supabase.from("invoice_emails").insert({
          invoice_id: body.invoice_id,
          sent_to: "unknown",
          status: "failed",
          error: err.message,
        });
      }
    } catch (_) {}

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
