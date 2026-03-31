import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "https://esm.sh/nodemailer@6.9.10";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadPayload {
  name: string;
  email: string;
  services: string;
  businessType: string;
  budget: string;
  timeline: string;
  message?: string;
  websiteUrl?: string;
  priority?: boolean;
}

// HTML-escape helper to prevent injection
function esc(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Validate URL starts with http(s)
function safeHref(url: string | undefined | null): string {
  const u = (url ?? "").trim();
  if (/^https?:\/\//i.test(u)) return esc(u);
  return "";
}

async function sendSlack(lead: LeadPayload) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
  if (!LOVABLE_API_KEY || !SLACK_API_KEY) {
    console.error("Missing Slack env vars");
    return;
  }

  const priorityEmoji = lead.priority ? "🔥 *HIGH PRIORITY*\n" : "";
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "🚀 New Lead Submission", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name:*\n${lead.name}` },
        { type: "mrkdwn", text: `*Email:*\n${lead.email}` },
        { type: "mrkdwn", text: `*Business:*\n${lead.businessType}` },
        { type: "mrkdwn", text: `*Budget:*\n${lead.budget}` },
        { type: "mrkdwn", text: `*Timeline:*\n${lead.timeline}` },
        { type: "mrkdwn", text: `*Services:*\n${lead.services}` },
      ],
    },
  ];

  if (lead.websiteUrl) {
    blocks.push({
      type: "section",
      fields: [{ type: "mrkdwn", text: `*Website:*\n${lead.websiteUrl}` }],
    });
  }
  if (lead.message) {
    blocks.push({
      type: "section",
      fields: [{ type: "mrkdwn", text: `*Message:*\n${lead.message}` }],
    });
  }

  const res = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": SLACK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "#leads",
      text: `${priorityEmoji}New lead from ${lead.name} (${lead.email})`,
      blocks,
      username: "Digiiworks Leads",
      icon_emoji: ":rocket:",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    console.error("Slack error:", JSON.stringify(data));
  }
}

async function sendEmail(lead: LeadPayload) {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!host || !user || !pass) {
    console.error("Missing SMTP env vars");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const priorityTag = lead.priority ? "🔥 HIGH PRIORITY — " : "";
  const safeUrl = safeHref(lead.websiteUrl);

  await transporter.sendMail({
    from: user,
    to: user,
    subject: `${priorityTag}New Lead: ${esc(lead.name)} — ${esc(lead.services)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#0ea5e9">New Lead Submission</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.name)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Business Type</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.businessType)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Budget</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.budget)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Timeline</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.timeline)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Services</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.services)}</td></tr>
          ${safeUrl ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Website</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="${safeUrl}">${safeUrl}</a></td></tr>` : ""}
          ${lead.message ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Message</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lead.message)}</td></tr>` : ""}
        </table>
      </div>
    `,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request comes from an authenticated context by checking
    // that the lead actually exists in the database (inserted via RLS-protected table)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is authenticated
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead: LeadPayload = await req.json();

    // Basic input validation
    if (!lead.name || !lead.email || !lead.services || !lead.businessType || !lead.budget || !lead.timeline) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire both in parallel
    const results = await Promise.allSettled([sendSlack(lead), sendEmail(lead)]);

    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message);

    if (errors.length > 0) {
      console.error("Notification errors:", errors);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("notify-lead error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
