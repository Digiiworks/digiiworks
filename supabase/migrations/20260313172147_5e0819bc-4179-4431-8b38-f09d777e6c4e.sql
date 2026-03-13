-- Add logo_url column to client_companies
ALTER TABLE public.client_companies ADD COLUMN logo_url text DEFAULT NULL;

-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', true);

-- Allow authenticated users to upload to client-logos bucket
CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete client logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'client-logos');