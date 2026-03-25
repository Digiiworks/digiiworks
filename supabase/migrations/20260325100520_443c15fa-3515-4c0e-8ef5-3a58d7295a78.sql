
-- 1. Add 'partial' to invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'partial';

-- 2. Add missing columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- 3. Add country column to client_companies
ALTER TABLE public.client_companies ADD COLUMN IF NOT EXISTS country text;

-- 4. Create exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  currency_code text PRIMARY KEY,
  rate_vs_usd numeric NOT NULL DEFAULT 1,
  margin_pct numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create blog_generation_config table
CREATE TABLE IF NOT EXISTS public.blog_generation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tone text NOT NULL DEFAULT 'professional',
  default_category text NOT NULL DEFAULT 'Business',
  auto_publish boolean NOT NULL DEFAULT false,
  topics_queue text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_generation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blog config" ON public.blog_generation_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create blog_generation_jobs table
CREATE TABLE IF NOT EXISTS public.blog_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  post_id uuid,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);
ALTER TABLE public.blog_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blog jobs" ON public.blog_generation_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Create dunning_sends table
CREATE TABLE IF NOT EXISTS public.dunning_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  days_overdue integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, days_overdue)
);
ALTER TABLE public.dunning_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage dunning sends" ON public.dunning_sends FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Create next_invoice_number function
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
  result text;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN invoice_number ~ '^INV-[0-9]+$'
    THEN CAST(SUBSTRING(invoice_number FROM 5) AS integer)
    ELSE 0 END
  ), 0) + 1 INTO next_num FROM invoices;
  result := 'INV-' || LPAD(next_num::text, 4, '0');
  RETURN result;
END;
$$;

-- 10. Seed default exchange rates
INSERT INTO public.exchange_rates (currency_code, rate_vs_usd, margin_pct)
VALUES ('ZAR', 18.5, 0), ('THB', 35.0, 0)
ON CONFLICT (currency_code) DO NOTHING;
