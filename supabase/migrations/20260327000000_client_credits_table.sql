-- Credit ledger: tracks every credit added or applied per client company.
-- Balance = SUM(amount) per company. Positive = credit added, negative = applied.
-- This replaces the credit_balance column approach (no ALTER TABLE needed).

CREATE TABLE IF NOT EXISTS public.client_credits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID  NOT NULL REFERENCES public.client_companies(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  note        TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credits"
  ON public.client_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Convenience view: current balance per company
CREATE OR REPLACE VIEW public.client_credit_balances AS
  SELECT client_company_id, COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS balance
  FROM public.client_credits
  GROUP BY client_company_id;
