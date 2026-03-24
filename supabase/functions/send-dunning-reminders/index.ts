import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Days-overdue milestones at which reminder emails are sent
const MILESTONES = [1, 7, 14];

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('BASE_URL') || 'https://digiiworks.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch all overdue invoices that have a due_date set
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, client_id')
      .eq('status', 'overdue')
      .not('due_date', 'is', null);

    if (invErr) throw invErr;

    const today = new Date();
    let sent = 0;
    const skipped: string[] = [];

    for (const inv of invoices ?? []) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(inv.due_date).getTime()) / 86_400_000
      );

      for (const milestone of MILESTONES) {
        if (daysOverdue < milestone) continue;

        // Check if we already sent a reminder at this milestone
        const { data: existing } = await supabase
          .from('dunning_sends')
          .select('id')
          .eq('invoice_id', inv.id)
          .eq('days_overdue', milestone)
          .maybeSingle();

        if (existing) continue;

        // Send reminder via send-invoice-email
        const { error: sendErr } = await supabase.functions.invoke('send-invoice-email', {
          body: { invoice_id: inv.id, force_resend: true },
        });

        if (sendErr) {
          skipped.push(`${inv.invoice_number} @${milestone}d: ${sendErr.message}`);
          continue;
        }

        // Record that we sent this milestone
        await supabase.from('dunning_sends').insert({
          invoice_id: inv.id,
          days_overdue: milestone,
        });

        sent++;
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
