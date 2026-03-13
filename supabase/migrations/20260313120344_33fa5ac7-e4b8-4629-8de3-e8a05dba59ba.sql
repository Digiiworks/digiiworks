-- Replace the overly-broad public SELECT policy on page_content
-- with one that hides sensitive payment/banking configuration from anonymous users

DROP POLICY IF EXISTS "Anyone can read page content" ON public.page_content;

-- Public can read non-sensitive page content (excludes payment_settings)
CREATE POLICY "Public can read non-sensitive page content"
ON public.page_content
FOR SELECT
TO public
USING (page_key <> 'payment_settings');

-- Authenticated admins/editors can read ALL page content including payment_settings
CREATE POLICY "Admins can read all page content"
ON public.page_content
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);