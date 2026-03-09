

## Invoice Email System Plan

### Database Changes

1. **New `invoice_emails` table** to track all sent emails:
   - `id`, `invoice_id` (FK), `sent_to` (email), `sent_at`, `status` (sent/failed/scheduled), `scheduled_for` (timestamptz), `error` (text nullable)
   - RLS: admins can manage, clients can view their own

2. **Add `send_date` column to `invoices`** — the chosen send date, defaults to 1st of next month

### Edge Function: `send-invoice-email`

- Accepts `invoice_id` (and optional `force_resend` flag)
- Fetches invoice + line items + client profile from DB
- Renders an HTML email template with:
  - Company branding (logo, colors)
  - Invoice number, date, due date
  - Line items table
  - Total / outstanding amount
  - **Payment links** (Stripe / Yoco buttons matching the client dashboard)
  - Link to client dashboard
- Sends via existing SMTP credentials (already configured)
- Logs the send to `invoice_emails` table
- Can also be called with `mode: "scheduled"` to process all invoices where `send_date <= now()` and status is `draft`→ changes to `sent`

### Admin UI Updates (`Invoices.tsx`)

1. **Send date picker** on invoice create/edit form — defaults to 1st of current/next month
2. **"Send Email" button** on invoice detail — calls edge function immediately
3. **"Resend" button** on previously sent invoices
4. **Email history panel** inside invoice detail — shows all sends with timestamp, status, recipient
5. **Scheduled indicator** — badge showing scheduled send date on invoice list

### Scheduled Sending

- Use `pg_cron` to call `send-invoice-email` with `mode: "scheduled"` daily at midnight
- The function checks for invoices with `send_date <= today` that haven't been emailed yet, and sends them

### Summary of Changes

| Area | What |
|------|------|
| DB migration | `invoice_emails` table + `send_date` on invoices |
| Edge function | `send-invoice-email` (manual + scheduled) |
| pg_cron | Daily job to process scheduled sends |
| Admin UI | Send date field, send/resend buttons, email history |
| Email template | Branded HTML with payment links |

