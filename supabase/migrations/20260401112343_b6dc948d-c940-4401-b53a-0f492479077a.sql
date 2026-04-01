
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_client_company_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_client_company_id_fkey
  FOREIGN KEY (client_company_id) REFERENCES public.client_companies(id) ON DELETE CASCADE;

ALTER TABLE public.client_recurring_services
  DROP CONSTRAINT IF EXISTS client_recurring_services_client_company_id_fkey;
ALTER TABLE public.client_recurring_services
  ADD CONSTRAINT client_recurring_services_client_company_id_fkey
  FOREIGN KEY (client_company_id) REFERENCES public.client_companies(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_emails
  DROP CONSTRAINT IF EXISTS invoice_emails_invoice_id_fkey;
ALTER TABLE public.invoice_emails
  ADD CONSTRAINT invoice_emails_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
