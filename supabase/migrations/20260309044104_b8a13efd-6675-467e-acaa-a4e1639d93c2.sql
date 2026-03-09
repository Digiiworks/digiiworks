-- Create product_categories table
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'gray',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
CREATE POLICY "Anyone can read categories" ON public.product_categories
  FOR SELECT USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON public.product_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert existing categories
INSERT INTO public.product_categories (name, color, sort_order) VALUES
  ('Digital Architecture', 'blue', 1),
  ('Growth Engine', 'green', 2),
  ('AI & Automation', 'purple', 3),
  ('Other', 'gray', 99);
