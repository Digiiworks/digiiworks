-- Track a running credit balance per client company.
-- Credits are added manually by admins and applied as negative line items on invoices.
ALTER TABLE public.client_companies
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(10,2) NOT NULL DEFAULT 0;
