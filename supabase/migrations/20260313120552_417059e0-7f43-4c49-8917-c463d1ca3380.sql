-- Switch from blocklist to allowlist for public page_content access
DROP POLICY IF EXISTS "Public can read non-sensitive page content" ON public.page_content;

-- Allowlist: only explicitly safe page_keys are publicly readable
CREATE POLICY "Public can read allowed page content"
ON public.page_content
FOR SELECT
TO public
USING (page_key IN ('homepage', 'about', 'services', 'contact', 'terms', 'privacy'));