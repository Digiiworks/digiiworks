

## Fix: Stripe Direct Payment Link in Emails + Bank Info

### Problem 1: Stripe Button Requires Login
The "Pay with Stripe" button in emails links to `/client` — a protected page requiring authentication. Clients clicking it get redirected to a login page instead of paying.

**Fix:** Create a new public edge function `create-stripe-checkout-public` that accepts an invoice ID + HMAC token (no auth required). The email function will generate a link to this endpoint. When clicked, it creates a Stripe Checkout Session server-side and redirects the client directly to Stripe's payment page — no login needed.

Flow:
1. `send-invoice-email` generates an HMAC-signed link: `/functions/v1/create-stripe-checkout-public?invoice_id=xxx&token=yyy`
2. Client clicks the link in the email
3. Edge function verifies the HMAC token, creates a Stripe Checkout Session, and returns a 302 redirect to Stripe's checkout URL
4. After payment, Stripe redirects back to the site

### Problem 2: Bank Info Not Showing for ZAR
The South Africa bank fields are all empty strings in the database. The `hasAnyBankField` function correctly returns `false` for empty strings, so the fallback picks Global (USD) bank info instead. This is actually working as designed — if you fill in the South Africa bank details in Settings, they will appear.

However, the fallback label says "International" when it shows Global bank details for a ZAR invoice, which may be confusing. I'll make the label clearer.

### Files to Change

1. **Create `supabase/functions/create-stripe-checkout-public/index.ts`**
   - Public endpoint (no JWT required)
   - Accepts `invoice_id` and `token` query params
   - Verifies HMAC token using service role key
   - Creates Stripe Checkout Session with invoice details
   - Returns 302 redirect to Stripe checkout URL

2. **Update `supabase/config.toml`**
   - Add `[functions.create-stripe-checkout-public]` with `verify_jwt = false`

3. **Update `supabase/functions/send-invoice-email/index.ts`**
   - Change Stripe button href from `/client` to the public checkout endpoint URL with HMAC-signed token
   - For test mode, use a placeholder or disabled button since there's no real invoice ID

4. **Update `src/pages/InvoicePrint.tsx`**
   - Update Stripe payment button to call the public endpoint instead of requiring auth

