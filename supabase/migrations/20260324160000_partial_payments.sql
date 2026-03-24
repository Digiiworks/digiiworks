-- L1: Partial payment support
-- Add 'partial' status to the invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'partial';

-- Track how much has been collected so far
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
