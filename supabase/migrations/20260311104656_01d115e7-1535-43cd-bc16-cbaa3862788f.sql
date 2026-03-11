
CREATE TABLE public.client_recurring_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id, product_id)
);

ALTER TABLE public.client_recurring_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurring services"
  ON public.client_recurring_services FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own recurring services"
  ON public.client_recurring_services FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE TRIGGER update_client_recurring_services_updated_at
  BEFORE UPDATE ON public.client_recurring_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
