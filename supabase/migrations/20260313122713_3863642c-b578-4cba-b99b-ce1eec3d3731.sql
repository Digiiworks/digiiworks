
-- Fix blog-images upload policy operator precedence bug
DROP POLICY IF EXISTS "Admins/editors can upload blog images" ON storage.objects;
CREATE POLICY "Admins/editors can upload blog images"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'blog-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'editor'::app_role)
    )
  );
