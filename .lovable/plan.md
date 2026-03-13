

## Settings Page Reorganization

### Current Problem
The settings page has 6 horizontal tabs that are cluttered and mix unrelated concerns (banking, payment methods, tracking pixels). The Settings nav item is positioned mid-sidebar instead of at the bottom.

### New Layout

Replace the single tabbed page with a **two-section vertical layout** — no top tab bar.

#### Section 1: Payments & Banking
A single card/section containing:
- **Regional Bank Accounts** — inner tabs (Global USD / Thailand THB / South Africa ZAR) for switching between bank detail forms
- **Payment Links** — Yoco and Wise link fields below the bank tabs
- **Payment Methods** — Stripe and Yoco toggles below payment links

All payment-related config in one scrollable section.

#### Section 2: Tracking & Analytics
A separate card below for:
- Google Pixel / GA4 ID
- Meta (Facebook) Pixel ID

This keeps tracking separate and makes room for future non-payment settings.

### Sidebar Change

**`src/components/admin/AdminLayout.tsx`**:
- Move the Settings nav item out of the main `navItems` array
- Render it separately at the bottom of the sidebar, just above the user info/sign-out section (in the `border-t` area)
- Apply to both desktop and mobile sidebar views

### Files Changed
1. **`src/pages/admin/Settings.tsx`** — Remove top-level `Tabs`, restructure into two stacked sections. Keep inner tabs only for regional banks.
2. **`src/components/admin/AdminLayout.tsx`** — Move Settings link to bottom of sidebar.

