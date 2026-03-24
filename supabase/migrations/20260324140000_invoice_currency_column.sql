-- H7: Add currency column to invoices table (denormalization for audit safety).
--
-- Previously currency was looked up dynamically from client_companies at
-- email-send and payment-checkout time. This caused:
--   1. Data corruption if company is deleted after invoice creation
--   2. Wrong currency if company currency changes after invoice creation
--   3. Extra DB roundtrip on every payment/email operation
--
-- This migration:
--   1. Adds currency column to invoices with default 'USD'
--   2. Backfills existing rows from their client_companies.currency

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Backfill from client_companies where linked
UPDATE public.invoices i
SET currency = cc.currency
FROM public.client_companies cc
WHERE i.client_company_id = cc.id
  AND cc.currency IS NOT NULL
  AND cc.currency <> '';
