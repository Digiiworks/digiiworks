

## Invoice Actions — Sent Status Awareness + Resend After Edit

### Summary
Make it visually obvious when an invoice has already been emailed. Orange-tinted Send and Edit buttons for sent invoices, with confirmation dialogs before resending or editing. After saving edits on a previously-sent invoice, offer to resend only if changes were made.

### Changes — all in `src/pages/admin/Invoices.tsx`

**1. Helper function**
```typescript
const isSentAlready = (status: string) => ['sent', 'overdue', 'paid'].includes(status);
```

**2. New state variables**
- `resendConfirmId: string | null` — triggers resend confirmation dialog
- `editSentId: Invoice | null` — triggers edit-sent confirmation dialog  
- `resendAfterEdit: boolean` — tracks whether to show "resend?" prompt after saving
- `originalFormSnapshot: string` — JSON snapshot of form + line items at edit open, used to detect changes

**3. Desktop table actions (lines ~960-975)**
- **Send button**: Show for all non-cancelled invoices (remove `!== 'paid'` check). If `isSentAlready`, style orange (`text-orange-400 border-orange-500/50 hover:bg-orange-500/10`) and onClick opens `resendConfirmId` dialog instead of sending directly. Otherwise keep current cyan style and direct send.
- **Edit button**: Show for all non-cancelled invoices (remove `=== 'draft'` check). If `isSentAlready`, style orange and onClick sets `editSentId` to trigger warning dialog. Otherwise direct `openEdit`.

**4. Mobile card actions (lines ~841-853)**
- Same logic as desktop: show Send/Edit for all non-cancelled, orange styling + dialog gate for sent invoices.

**5. Three new ConfirmDialog instances**

a) **Resend confirmation** — when clicking orange Send:
- Title: "Email Already Sent"
- Description: "This invoice has already been emailed to the client. Are you sure you want to resend it?"
- Confirm: "Resend" → calls `handleSendEmail(resendConfirmId, true)`

b) **Edit-sent warning** — when clicking orange Edit on sent invoice:
- Title: "Editing Sent Invoice"
- Description: "This invoice has already been sent to the client. Changes won't be reflected in emails already delivered. Continue?"
- Confirm: "Edit Anyway" → calls `openEdit(editSentId)`

c) **Resend-after-edit prompt** — shown after `handleUpdate` succeeds on a previously-sent invoice, only if changes were detected:
- Title: "Invoice Updated"
- Description: "This invoice has been sent before. Would you like to resend the updated version to the client?"
- Confirm: "Resend Now" → calls `handleSendEmail(id, true)`
- Cancel: "Not Now" → just closes

**6. Change detection logic**
- In `openEdit`: capture a JSON snapshot of `{ form, lineItems }` into `originalFormSnapshot`
- In `handleUpdate`: after successful save, compare current `{ form, lineItems }` JSON against snapshot. If different AND `isSentAlready(editingInvoice.status)`, show the resend-after-edit dialog instead of just closing. If no changes or invoice is draft, close normally.

**7. Detail view (lines ~1324-1346)**
- Keep existing Send/Resend buttons but apply orange styling to Send button when `detailEmails.some(e => e.status === 'sent')`.

