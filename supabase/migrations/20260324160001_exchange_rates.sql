-- L2: Exchange rates for auto-pricing products in ZAR/THB when no direct price is set
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL UNIQUE,      -- e.g. 'ZAR', 'THB'
  rate_vs_usd   NUMERIC(12,6) NOT NULL,    -- units of this currency per 1 USD
  margin_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write exchange rates
CREATE POLICY "admin_all_exchange_rates" ON public.exchange_rates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults (approximate market rates; admins can update via Settings)
INSERT INTO public.exchange_rates (currency_code, rate_vs_usd, margin_pct)
VALUES
  ('ZAR', 18.5, 0),
  ('THB', 35.0, 0)
ON CONFLICT (currency_code) DO NOTHING;
