-- Fix invoice currencies: re-backfill from client_companies for every invoice
-- where the stored currency does not match the linked company's currency.
-- This corrects invoices that were defaulted to 'USD' at column creation time
-- or created before exchange rates were loaded in the frontend.

UPDATE public.invoices i
SET currency = cc.currency
FROM public.client_companies cc
WHERE i.client_company_id = cc.id
  AND cc.currency IS NOT NULL
  AND cc.currency <> ''
  AND cc.currency <> i.currency;

-- For invoices not linked to a company, fall back to the profile currency
UPDATE public.invoices i
SET currency = p.currency
FROM public.profiles p
WHERE i.client_id = p.user_id
  AND i.client_company_id IS NULL
  AND p.currency IS NOT NULL
  AND p.currency <> ''
  AND p.currency <> i.currency;
