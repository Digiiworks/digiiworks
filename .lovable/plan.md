

## Plan: Auto-generate Invoice Prompt on Client Creation with Recurring Services

### What it does

After successfully creating a client with recurring services, if today is on or after the 3rd of the month, check whether an invoice already exists for this client company for the current month. If no invoice exists, show a confirmation dialog asking the admin if they want to generate one immediately for the current month.

### Changes

**1. `src/pages/admin/Clients.tsx`**

- Add new state: `showInvoicePrompt` (boolean), `pendingInvoiceData` (stores `user_id`, `client_company_id`, `currency`, `company_name`, and the recurring services)
- After successful client creation + recurring services save (in `handleCreate`, around line 410):
  - Check if today's date is >= 3rd of month
  - If yes, query `invoices` table for any invoice matching this `client_company_id` in the current month
  - If none found, set `showInvoicePrompt = true` and store the pending data instead of immediately closing the dialog
  - If invoice exists or date < 3rd, proceed as normal (close dialog)
- Add a new `ConfirmDialog` (reusing existing component) that asks: "No invoice exists for [Company] this month. Would you like to generate one now?"
- On confirm: create a draft invoice with line items from the recurring services (same logic as `generate-recurring-invoices` edge function but inline — insert invoice + invoice_items), then close and refresh
- On cancel: just close and proceed as normal

**2. No database or edge function changes needed** — we create the invoice directly via the Supabase client using existing tables and RLS policies (admin has full access).

### Technical Flow

```text
handleCreate success
  → recurringServices saved
  → if day >= 3 && no invoice this month for company
    → show ConfirmDialog "Generate invoice for this month?"
      → Yes: insert invoice + invoice_items as draft, toast success
      → No: close, done
  → else: close as normal
```

Invoice creation will mirror the recurring invoice generator: calculate totals from the services' effective prices, set status to `draft`, due date to 1st of next month, and auto-generate the next invoice number.

