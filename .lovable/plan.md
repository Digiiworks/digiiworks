

## Fix: "Pay Invoice" Button Should Show Payment Options, Not Auto-Mark as Paid

### Problem
The admin "Pay Invoice" button instantly marks invoices as paid in the database without any actual payment. This is wrong -- it should open a dialog showing the available payment options (Stripe, Yoco, Wise) so the admin can redirect to or initiate a real payment flow.

### Plan

**1. Add a Payment Options Dialog**

Create a new dialog state (`payDialog`) in `src/pages/admin/Invoices.tsx` that opens when "Pay" is clicked, displaying the invoice details and payment method buttons:

- **Stripe** -- calls `create-stripe-checkout` edge function (existing), redirects to Stripe checkout
- **Yoco** -- calls `create-yoco-checkout` edge function (existing), redirects to Yoco checkout (only for ZAR invoices)
- **Wise** -- opens the Wise payment link from payment settings (if configured)
- **Mark as Paid (Manual)** -- keeps the current manual mark-as-paid functionality but clearly labeled as a manual override

**2. Fetch Payment Settings**

Add a fetch for `page_content` with `page_key = 'payment_settings'` in `fetchAll()` to get the enabled payment methods and Wise link (same pattern as `ClientDashboard.tsx`).

**3. Wire Up All Pay Buttons**

Replace all three `handlePayClick` call sites (table row, mobile card, detail drawer) to open the dialog instead of directly marking paid.

**4. Payment Flow**

Each button in the dialog will:
- Stripe/Yoco: invoke the existing edge function, redirect to payment gateway
- Wise: open payment link in new tab
- Manual: update DB directly (current behavior, but behind a clearly labeled "Mark as Paid Manually" button with a warning)

### Files to Change
- `src/pages/admin/Invoices.tsx` -- add payment dialog, fetch payment settings, refactor `handlePayClick`

