-- Add a default tax rate per client company.
-- Used by recurring invoice generation so each client's invoices
-- are created with the correct tax rate automatically.

ALTER TABLE public.client_companies
  ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
