-- Add category column to products table
ALTER TABLE public.products ADD COLUMN category text DEFAULT null;

-- Create index for category filtering
CREATE INDEX idx_products_category ON public.products (category);
