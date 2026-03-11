ALTER TABLE public.client_recurring_services ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.client_recurring_services ADD COLUMN start_date date DEFAULT NULL;