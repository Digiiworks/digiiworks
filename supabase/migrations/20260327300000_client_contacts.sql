-- Multiple contacts per company: billing, technical, primary, other.

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID NOT NULL REFERENCES public.client_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'other',
  -- values: 'billing', 'technical', 'primary', 'other'
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON public.client_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
