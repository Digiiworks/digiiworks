-- Fix: Remove payment_settings from the public page_content RLS policy.
--
-- Migration 20260315162646 accidentally re-added 'payment_settings' to the
-- public allowlist, exposing bank account and payment configuration data to
-- unauthenticated users via the Supabase REST API.
--
-- This migration restores the secure allowlist (public marketing pages only)
-- and adds a separate admin/editor policy for payment_settings access.

-- 1. Drop the regressed policy
DROP POLICY IF EXISTS "Public can read allowed page content" ON public.page_content;

-- 2. Re-create the public allowlist WITHOUT payment_settings
CREATE POLICY "Public can read allowed page content"
  ON public.page_content
  FOR SELECT
  TO public
  USING (
    page_key = ANY (ARRAY[
      'homepage',
      'about',
      'services',
      'contact',
      'terms',
      'privacy'
    ])
  );

-- 3. Ensure admin/editor roles can still read payment_settings
--    (The existing "Admins and editors can manage page content" policy covers
--     SELECT for authenticated admin/editor users, but we add an explicit
--     SELECT policy for clarity and forward-safety.)
DROP POLICY IF EXISTS "Admins and editors can read sensitive page content" ON public.page_content;

CREATE POLICY "Admins and editors can read sensitive page content"
  ON public.page_content
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  );
