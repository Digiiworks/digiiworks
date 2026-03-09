
-- Create invoice email status enum
CREATE TYPE public.invoice_email_status AS ENUM ('scheduled', 'sent', 'failed');

-- Create invoice_emails table
CREATE TABLE public.invoice_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sent_to text NOT NULL,
  sent_at timestamptz,
  scheduled_for timestamptz,
  status invoice_email_status NOT NULL DEFAULT 'scheduled',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_emails ENABLE ROW LEVEL SECURITY;

-- Admins can manage all email records
CREATE POLICY "Admins can manage invoice emails" ON public.invoice_emails
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Clients can view emails for their own invoices
CREATE POLICY "Clients can view own invoice emails" ON public.invoice_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices WHERE invoices.id = invoice_emails.invoice_id AND invoices.client_id = auth.uid()
    )
  );

-- Add send_date to invoices (defaults to 1st of next month)
ALTER TABLE public.invoices ADD COLUMN send_date date DEFAULT (date_trunc('month', now()) + interval '1 month')::date;

-- Index for scheduled email lookups
CREATE INDEX idx_invoice_emails_invoice_id ON public.invoice_emails(invoice_id);
CREATE INDEX idx_invoices_send_date ON public.invoices(send_date);
