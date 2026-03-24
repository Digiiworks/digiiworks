-- H10: Add recurring_invoice_runs table for idempotent recurring invoice generation.
--
-- The generate-recurring-invoices edge function previously used a client-side
-- Set to track already-invoiced clients, which is not safe against concurrent
-- function invocations (e.g. two cron triggers firing simultaneously).
--
-- This table provides a DB-level unique constraint so that only one invoice
-- per client per billing month can ever be generated, regardless of how many
-- times the function fires.

CREATE TABLE IF NOT EXISTS public.recurring_invoice_runs (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_month DATE       NOT NULL,  -- First day of the billing month (e.g. 2026-03-01)
  invoice_id   UUID        REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, billing_month)
);

-- Enable RLS
ALTER TABLE public.recurring_invoice_runs ENABLE ROW LEVEL SECURITY;

-- Admins can read the run history
CREATE POLICY "Admins can read recurring runs"
  ON public.recurring_invoice_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Edge function (service role) handles inserts — no user INSERT policy needed
