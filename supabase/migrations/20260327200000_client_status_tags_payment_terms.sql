-- Client status classification, tags for segmentation, and payment terms per company.

ALTER TABLE public.client_companies
  ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'active',
  -- values: 'prospect', 'active', 'vip', 'on_hold', 'churned'
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER NOT NULL DEFAULT 30;
  -- 0=due on receipt, 14=net14, 30=net30, 60=net60
