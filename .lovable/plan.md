

## Plan: Pre-fill Yoco Payment Link with Invoice Amount

**Current state**: The "Pay with Yoco" button in invoice emails uses a static payment page link from admin settings, which opens with R0.00 (as shown in your screenshot).

**Solution**: Yoco payment page URLs support an `amount` query parameter (in cents). We will dynamically append the invoice total to the link when building the email HTML.

### Changes

**File: `supabase/functions/send-invoice-email/index.ts`**

In `buildBankingHTML`, update the Yoco link construction to accept the invoice total and append it as a query parameter:

- Pass `invoiceTotal` into `buildBankingHTML`
- Convert total to cents: `Math.round(Number(invoiceTotal) * 100)`
- Append `?amount=XXXX` to the `yoco_payment_link` URL (handling existing query params with `&` if needed)

```
// Before
paymentLinks.yoco_payment_link

// After  
paymentLinks.yoco_payment_link + '?amount=' + Math.round(Number(invoiceTotal) * 100)
```

- Update all call sites of `buildBankingHTML` to pass the invoice total through

This is a single-file change — just the edge function template logic.

