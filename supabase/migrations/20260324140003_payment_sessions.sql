-- H1: Add payment_sessions table for checkout session reconciliation.
--
-- Tracks every Stripe and Yoco checkout session created, allowing admins
-- to see pending/abandoned/completed payment attempts per invoice.

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID        NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  gateway      TEXT        NOT NULL CHECK (gateway IN ('stripe', 'yoco')),
  session_id   TEXT        NOT NULL UNIQUE,            -- Stripe session ID or Yoco checkout ID
  status       TEXT        NOT NULL DEFAULT 'pending'  -- pending | completed | failed | expired
                           CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_sessions_invoice_idx
  ON public.payment_sessions (invoice_id);

-- Enable RLS
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can read all sessions
CREATE POLICY "Admins can read payment sessions"
  ON public.payment_sessions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Clients can read their own invoice sessions
CREATE POLICY "Clients can read own invoice payment sessions"
  ON public.payment_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payment_sessions.invoice_id
        AND invoices.client_id = auth.uid()
    )
  );

-- Edge functions (service role) handle inserts/updates
