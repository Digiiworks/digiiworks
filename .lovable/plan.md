

## Current State

- **Client dashboard** at `/dashboard` exists and shows invoices — but only for clients viewing their own.
- **Admin invoice management page** does NOT exist. There's no `/admin/invoices` route or page.
- The admin sidebar has no "Invoices" link.
- The database tables (`invoices`, `invoice_items`, `products`) and RLS policies are already in place.

## Plan

### 1. Create Admin Invoices Page (`src/pages/admin/Invoices.tsx`)

A full CRUD page for admins to:
- **List** all invoices with client name, status, total, due date
- **Create** new invoices: select client (from profiles), add line items (from products or custom), set due date, notes
- **Edit** invoice status (draft → sent → paid/overdue/cancelled)
- **View** invoice detail with line items
- **Delete** invoices

Uses a table view with status badges, filters by status, and a dialog/sheet for create/edit.

### 2. Add Route and Navigation

- **`src/App.tsx`**: Add `/admin/invoices` route under the admin layout, restricted to `admin` role
- **`src/components/admin/AdminLayout.tsx`**: Add "Invoices" nav item with `DollarSign` icon, visible to admins (and optionally clients)

### 3. Update Client Dashboard Link

- Add "Invoices" to the client's visible nav items in `AdminLayout.tsx` so clients can also reach `/admin/invoices` (read-only view) — OR keep the separate `/dashboard` for clients and only add admin invoices to admin nav. I'll keep them separate: admins manage at `/admin/invoices`, clients view at `/dashboard`.

### Technical Details

- Admin invoices page will query `invoices` joined with `profiles` (for client name) and `invoice_items`
- Create form: select client from profiles dropdown, add line items with product picker or custom description/price, auto-calculate totals
- Status updates via simple dropdown/select change
- All mutations use the existing RLS policies (admin has ALL access)

