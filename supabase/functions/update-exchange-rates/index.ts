import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('BASE_URL') || 'https://digiiworks.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Fetch live rates from Frankfurter (ECB-sourced, free, no API key)
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR,THB');
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
    const { rates } = await res.json() as { rates: Record<string, number> };

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Upsert each currency — preserve existing margin_pct if row already exists
    for (const [currency_code, rate_vs_usd] of Object.entries(rates)) {
      const { data: existing } = await supabase
        .from('exchange_rates')
        .select('margin_pct')
        .eq('currency_code', currency_code)
        .maybeSingle();

      await supabase.from('exchange_rates').upsert({
        currency_code,
        rate_vs_usd,
        margin_pct: existing?.margin_pct ?? 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'currency_code' });
    }

    return new Response(
      JSON.stringify({ updated: Object.keys(rates), rates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
