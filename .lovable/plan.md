

## Recurring Services & Auto-Invoice Generation

### Overview
Add the ability to assign recurring services (products) to clients. On the 3rd of every month, an edge function auto-generates draft invoices for clients with active recurring services (if one hasn't already been created that month). Admins can manage recurring services from the client create/edit dialogs.

### Database Changes

**New table: `client_recurring_services`**
- `id` (uuid, PK)
- `client_id` (uuid, references profiles.user_id)
- `product_id` (uuid, references products.id)
- `quantity` (integer, default 1)
- `active` (boolean, default true)
- `created_at`, `updated_at` (timestamps)
- Unique constraint on `(client_id, product_id)`
- RLS: admin full access, clients can view their own

### UI Changes

**1. Client Create Dialog (`Clients.tsx`)**
- Add a "Recurring Services" section below the existing fields
- Multi-select from active products with quantity per service
- Saved to `client_recurring_services` after client creation

**2. Client Edit Dialog (`Clients.tsx`)**
- Same recurring services section, pre-populated with current subscriptions
- Toggle services on/off, adjust quantities
- Save updates on submit

**3. Visual indicator in client table**
- Show a small badge or count of active recurring services per client

### Edge Function: `generate-recurring-invoices`

- Triggered by pg_cron on the 3rd of every month
- For each client with active recurring services:
  1. Check if an invoice already exists for that client in the current month
  2. If not, create a draft invoice with the recurring line items, using the client's currency
  3. Set due date to end of month or 1st of next month
- Returns a summary of generated invoices

### Config Changes

- Add `[functions.generate-recurring-invoices]` with `verify_jwt = false` to config.toml
- Set up pg_cron job: runs on the 3rd of each month (`0 6 3 * *`)

### Implementation Steps

1. Create `client_recurring_services` table via migration with RLS policies
2. Update `Clients.tsx` — add recurring services selector to create and edit dialogs, fetch/save recurring services
3. Create `supabase/functions/generate-recurring-invoices/index.ts` — auto-generate draft invoices
4. Register pg_cron job to call the edge function on the 3rd of each month

