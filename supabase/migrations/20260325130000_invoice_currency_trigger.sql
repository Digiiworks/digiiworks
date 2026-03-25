-- Permanently fix invoice currency reliability.
--
-- Problem: invoices.currency was added with DEFAULT 'USD', so all historical
-- rows show USD regardless of the client's actual currency. There was no
-- DB-level enforcement to keep it in sync with client_companies.currency.
-- The frontend worked around this with fragile company joins that kept breaking.
--
-- This migration:
--   1. Creates a trigger that auto-sets currency on every INSERT and on every
--      UPDATE that changes client_company_id
--   2. Does a definitive one-time backfill of all existing rows using the same
--      priority: company currency → profile currency → 'USD'

-- ─── Trigger function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_invoice_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- Priority 1: company currency (most reliable source of truth)
  IF NEW.client_company_id IS NOT NULL THEN
    SELECT currency INTO NEW.currency
    FROM public.client_companies
    WHERE id = NEW.client_company_id;
  END IF;

  -- Priority 2: profile currency (for invoices not linked to a company)
  IF (NEW.currency IS NULL OR NEW.currency = '' OR NEW.currency = 'USD')
     AND NEW.client_company_id IS NULL THEN
    SELECT currency INTO NEW.currency
    FROM public.profiles
    WHERE user_id = NEW.client_id;
  END IF;

  -- Fallback: always have a valid currency
  IF NEW.currency IS NULL OR NEW.currency = '' THEN
    NEW.currency := 'USD';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Attach trigger ──────────────────────────────────────────────────────────

-- Fires on INSERT (catches every new invoice) and on UPDATE when
-- client_company_id changes (catches reassignment to a different company)
DROP TRIGGER IF EXISTS invoice_currency_sync ON public.invoices;
CREATE TRIGGER invoice_currency_sync
  BEFORE INSERT OR UPDATE OF client_company_id
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_currency();

-- ─── Backfill existing rows ──────────────────────────────────────────────────
-- Use the same priority order as the trigger.

UPDATE public.invoices i
SET currency = COALESCE(
  NULLIF((SELECT cc.currency FROM public.client_companies cc WHERE cc.id = i.client_company_id), ''),
  NULLIF((SELECT p.currency  FROM public.profiles        p  WHERE p.user_id = i.client_id),      ''),
  'USD'
);
