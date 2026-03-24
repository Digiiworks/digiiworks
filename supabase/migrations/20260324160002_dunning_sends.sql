-- L3: Track dunning reminder emails sent for overdue invoices
CREATE TABLE IF NOT EXISTS public.dunning_sends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  days_overdue INTEGER NOT NULL,  -- milestone: 1, 7, or 14
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, days_overdue)
);

ALTER TABLE public.dunning_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_dunning_sends" ON public.dunning_sends
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
