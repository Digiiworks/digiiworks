
DROP POLICY "Admins can manage invoice emails" ON public.invoice_emails;
CREATE POLICY "Admins can manage invoice emails"
  ON public.invoice_emails FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Clients can view own invoice emails" ON public.invoice_emails;
CREATE POLICY "Clients can view own invoice emails"
  ON public.invoice_emails FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_emails.invoice_id
      AND invoices.client_id = auth.uid()
  ));
