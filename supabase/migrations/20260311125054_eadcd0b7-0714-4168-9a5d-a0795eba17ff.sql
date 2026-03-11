
-- Create client_companies table
CREATE TABLE public.client_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  address TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  phone TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage client companies" ON public.client_companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view own companies" ON public.client_companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add client_company_id to invoices and client_recurring_services
ALTER TABLE public.invoices ADD COLUMN client_company_id UUID REFERENCES public.client_companies(id);
ALTER TABLE public.client_recurring_services ADD COLUMN client_company_id UUID REFERENCES public.client_companies(id);

-- Updated_at trigger
CREATE TRIGGER update_client_companies_updated_at
  BEFORE UPDATE ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing profile company data into client_companies
INSERT INTO public.client_companies (user_id, company_name, address, currency, phone, notes)
SELECT
  p.user_id,
  COALESCE(p.company, p.display_name, p.email, 'Unknown'),
  p.address,
  p.currency,
  p.phone,
  p.notes
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'client';

-- Link existing invoices to the migrated client_companies
UPDATE public.invoices i
SET client_company_id = cc.id
FROM public.client_companies cc
WHERE cc.user_id = i.client_id
AND i.client_company_id IS NULL;

-- Link existing recurring services to the migrated client_companies  
UPDATE public.client_recurring_services crs
SET client_company_id = cc.id
FROM public.client_companies cc
WHERE cc.user_id = crs.client_id
AND crs.client_company_id IS NULL;

-- Enable realtime for client_companies
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_companies;
