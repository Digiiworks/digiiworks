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

function buildBankingHTML(bankInfo: any, paymentLinks: any, currency: string) {
  if (!bankInfo) return '';
  
  const fields: string[] = [];
  if (bankInfo.bank_name) fields.push(`<strong>Bank:</strong> ${bankInfo.bank_name}`);
  if (bankInfo.account_name) fields.push(`<strong>Account Name:</strong> ${bankInfo.account_name}`);
  if (bankInfo.account_number) fields.push(`<strong>Account / IBAN:</strong> ${bankInfo.account_number}`);
  if (bankInfo.swift_code) fields.push(`<strong>SWIFT:</strong> ${bankInfo.swift_code}`);
  if (bankInfo.branch_code) fields.push(`<strong>Branch Code:</strong> ${bankInfo.branch_code}`);
  if (bankInfo.branch) fields.push(`<strong>Branch:</strong> ${bankInfo.branch}`);
  if (bankInfo.account_type) fields.push(`<strong>Account Type:</strong> ${bankInfo.account_type}`);
  if (bankInfo.reference_note) fields.push(`<em style="color:#888;">${bankInfo.reference_note}</em>`);

  if (fields.length === 0) return '';

  const regionLabel = currency === 'ZAR' ? 'South Africa' : currency === 'THB' ? 'Thailand' : 'International';

  let linksHTML = '';
  if (paymentLinks?.yoco_payment_link && currency === 'ZAR') {
    linksHTML += `<a href="${paymentLinks.yoco_payment_link}" style="display:inline-block;padding:10px 24px;background:#00c853;color:#fff;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px;margin-right:8px;">Pay with Yoco</a>`;
  }
  if (paymentLinks?.wise_payment_link) {
    linksHTML += `<a href="${paymentLinks.wise_payment_link}" style="display:inline-block;padding:10px 24px;background:#9fe870;color:#000;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px;">Pay with Wise</a>`;
  }

  return `
    <div style="margin-top:24px;padding:16px;background:#0a0a0a;border-radius:8px;border-left:3px solid #00e5ff;">
      <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#00e5ff;font-weight:700;">Direct Deposit — ${regionLabel}</p>
      ${fields.map(f => `<p style="margin:0 0 4px;font-size:13px;color:#ccc;">${f}</p>`).join('')}
    </div>
    ${linksHTML ? `<div style="text-align:center;margin:20px 0 0;">${linksHTML}</div>` : ''}`;
}

function currencySymbol(currency: string) {
  return currency === 'ZAR' ? 'R' : currency === 'THB' ? '฿' : '$';
}

function buildEmailHTML(invoice: any, items: InvoiceItem[], client: any, dashboardUrl: string, currency: string, paymentSettings?: any) {
  const sym = currencySymbol(currency);
  const itemRows = items
    .map(
      (it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:14px;">${it.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:14px;text-align:center;">${it.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:14px;text-align:right;">${sym}${Number(it.unit_price).toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a1a;color:#ccc;font-size:14px;text-align:right;">${sym}${Number(it.total).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const taxAmount = Number(invoice.subtotal) * (Number(invoice.tax_rate) / 100);
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "On receipt";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#000000;">
  <!-- Header -->
  <div style="padding:32px 24px;text-align:center;border-bottom:1px solid #1a1a1a;">
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#00e5ff;letter-spacing:2px;">DIGIIWORKS</h1>
    <p style="margin:8px 0 0;font-size:12px;color:#666;letter-spacing:3px;text-transform:uppercase;">Digital Agency</p>
  </div>

  <!-- Invoice Info -->
  <div style="padding:24px;">
    <table style="width:100%;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;">Invoice</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;font-family:monospace;">${invoice.invoice_number}</p>
        </td>
        <td style="text-align:right;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;">Due Date</p>
          <p style="margin:0;font-size:16px;color:#fff;">${dueDate}</p>
        </td>
      </tr>
    </table>

    <div style="background:#0a0a0a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#666;">Billed To</p>
      <p style="margin:0;font-size:16px;color:#fff;">${client.display_name || client.email}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#888;">${client.email}</p>
      ${client.company ? `<p style="margin:4px 0 0;font-size:14px;color:#888;">${client.company}</p>` : ""}
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="border-bottom:2px solid #00e5ff;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00e5ff;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00e5ff;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00e5ff;">Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00e5ff;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="border-top:1px solid #1a1a1a;padding-top:16px;">
      <table style="width:100%;max-width:250px;margin-left:auto;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#888;">Subtotal</td>
          <td style="padding:4px 0;font-size:13px;color:#ccc;text-align:right;font-family:monospace;">${sym}${Number(invoice.subtotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#888;">Tax (${invoice.tax_rate}%)</td>
          <td style="padding:4px 0;font-size:13px;color:#ccc;text-align:right;font-family:monospace;">${sym}${taxAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0 0;font-size:18px;font-weight:700;color:#fff;">Total</td>
          <td style="padding:8px 0 0;font-size:18px;font-weight:700;color:#00e5ff;text-align:right;font-family:monospace;">${sym}${Number(invoice.total).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `<div style="margin-top:24px;padding:12px 16px;background:#0a0a0a;border-radius:8px;border-left:3px solid #00e5ff;"><p style="margin:0;font-size:13px;color:#888;font-style:italic;">${invoice.notes}</p></div>` : ""}

    <!-- Payment Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:14px 40px;background:#00e5ff;color:#000;text-decoration:none;font-weight:700;font-size:15px;border-radius:6px;letter-spacing:1px;">
        VIEW &amp; PAY INVOICE
      </a>
    </div>
    ${(() => {
      if (!paymentSettings) return '';
      const bankKey = currency === 'ZAR' ? 'south_africa' : currency === 'THB' ? 'thai' : 'global';
      return buildBankingHTML(paymentSettings[bankKey], paymentSettings.payment_links, currency);
    })()}
  </div>

  <!-- Footer -->
  <div style="padding:24px;border-top:1px solid #1a1a1a;text-align:center;">
    <p style="margin:0;font-size:12px;color:#555;">© ${new Date().getFullYear()} DigiiWorks. All rights reserved.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#444;">This invoice was sent from DigiiWorks billing system.</p>
  </div>
</div>
</body>
</html>`;
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
    from: `"DigiiWorks Billing" <${smtpUser}>`,
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

    if (mode === "scheduled") {
      // Process all invoices with send_date <= today that haven't been emailed yet
      const today = new Date().toISOString().split("T")[0];
      const { data: invoices, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .in("status", ["draft", "sent"])
        .lte("send_date", today);

      if (invErr) throw invErr;

      for (const inv of invoices || []) {
        // Check if already sent
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

          const { data: items } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", inv.id);

          const html = buildEmailHTML(inv, items || [], client, dashboardBaseUrl, paymentSettings);
          await sendEmail(client.email, `Invoice ${inv.invoice_number} from DigiiWorks`, html);

          await supabase.from("invoice_emails").insert({
            invoice_id: inv.id,
            sent_to: client.email,
            sent_at: new Date().toISOString(),
            scheduled_for: inv.send_date,
            status: "sent",
          });

          // Update invoice status to sent if it was draft
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

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id);

    const html = buildEmailHTML(invoice, items || [], client, dashboardBaseUrl, paymentSettings);
    await sendEmail(client.email, `Invoice ${invoice.invoice_number} from DigiiWorks`, html);

    await supabase.from("invoice_emails").insert({
      invoice_id: invoice.id,
      sent_to: client.email,
      sent_at: new Date().toISOString(),
      status: "sent",
    });

    // Update invoice status to sent if it was draft
    if (invoice.status === "draft") {
      await supabase.from("invoices").update({ status: "sent" }).eq("id", invoice.id);
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: client.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // Log the error for the specific invoice if we have the id
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
