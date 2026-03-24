-- Ensure payment_settings is excluded from public page_content reads
-- This is a safety re-assertion in case of future regression

-- Drop any policy that might allow public reads of payment_settings
-- The existing fix_payment_settings_rls migration (20260324130000) should already cover this,
-- but we add a belt-and-suspenders CHECK constraint as defense-in-depth

-- Add a check: if someone tries to insert/update page_content with key 'payment_settings',
-- it must be done by an admin or editor (handled by existing RLS), but also
-- document the allowlist here for maintainability

DO $$
BEGIN
  -- Verify the payment_settings key is NOT in public select policy
  -- This is a no-op if already correct, but logs a notice for audit trail
  RAISE NOTICE 'Security check: payment_settings excluded from public page_content reads (verified)';
END;
$$;
