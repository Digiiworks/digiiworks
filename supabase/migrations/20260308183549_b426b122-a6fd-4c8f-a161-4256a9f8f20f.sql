
-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Public read access
CREATE POLICY "Blog images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');

-- Admins/editors can upload
CREATE POLICY "Admins/editors can upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role)
);

-- Admins/editors can delete
CREATE POLICY "Admins/editors can delete blog images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'blog-images' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
);
