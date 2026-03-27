-- Allow recurring_invoice_runs to track per-company (not just per-user),
-- so a user with multiple companies each gets their own invoice run.

ALTER TABLE public.recurring_invoice_runs
  ADD COLUMN IF NOT EXISTS client_company_id UUID REFERENCES public.client_companies(id) ON DELETE SET NULL;

-- Drop the old unique constraint (client_id, billing_month)
ALTER TABLE public.recurring_invoice_runs
  DROP CONSTRAINT IF EXISTS recurring_invoice_runs_client_id_billing_month_key;

-- New unique constraint: (client_id, client_company_id, billing_month)
-- NULLS NOT DISTINCT means two rows with client_company_id=NULL are treated as equal (prevents legacy duplicates)
ALTER TABLE public.recurring_invoice_runs
  ADD CONSTRAINT recurring_invoice_runs_unique
  UNIQUE NULLS NOT DISTINCT (client_id, client_company_id, billing_month);
