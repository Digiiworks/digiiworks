DROP POLICY IF EXISTS "Public can read allowed page content" ON public.page_content;

CREATE POLICY "Public can read allowed page content"
ON public.page_content
FOR SELECT
TO public
USING (page_key = ANY (ARRAY['homepage', 'about', 'services', 'contact', 'terms', 'privacy', 'payment_settings']));