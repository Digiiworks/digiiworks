-- Fix: Atomic, race-condition-safe invoice number generation.
--
-- Previously, invoice numbers were generated client-side using
-- `invoices.length + 1`, which is vulnerable to:
--   1. Race conditions (two admins creating invoices simultaneously)
--   2. Number reuse after invoice deletion
--
-- This migration replaces that with a PostgreSQL sequence and a
-- SECURITY DEFINER function callable by authenticated admin users.

-- 1. Create a dedicated sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Advance the sequence to the current max invoice number so existing
-- invoices are not duplicated. Uses a safe default of 0 if no invoices exist.
SELECT setval(
  'public.invoice_number_seq',
  GREATEST(
    (
      SELECT COALESCE(
        MAX(
          CAST(
            REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER
          )
        ),
        0
      )
      FROM public.invoices
      WHERE invoice_number ~ '^INV-[0-9]+$'
    ),
    0
  )
);

-- 2. Function to atomically generate the next invoice number
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  -- Only admin users may generate invoice numbers
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT nextval('public.invoice_number_seq') INTO next_val;
  RETURN 'INV-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- Grant execute to authenticated users (RLS inside the function handles admin check)
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;
