

## Multi-Step Onboarding Quiz — Homepage CTA Flow

### Overview
Create a new `/get-started` route with a multi-step quiz triggered from the homepage hero CTA. The quiz collects service interest, budget, timeline, business type, and website URL, then submits as a lead to the existing `leads` table. The current contact form stays untouched for simple inquiries.

### Steps

#### 1. Create quiz page `src/pages/GetStarted.tsx`
A 5-step animated form using framer-motion transitions:

- **Step 1 — Service Interest**: Grid of cards for each service from `SERVICE_OPTIONS`, grouped by pillar (Digital Architecture / Growth Engine / Autonomous Agency). Allow selecting one or multiple.
- **Step 2 — Business Type**: Radio-style cards: Startup, SMB, Enterprise, Creator/Personal
- **Step 3 — Budget Range**: Radio-style cards: Under $1K, $1–5K, $5–10K, $10K+
- **Step 4 — Timeline**: Radio-style cards: ASAP, 1–3 months, 3–6 months, Just exploring
- **Step 5 — Contact Details**: Name, email, current website URL (optional), and an optional message

Progress bar at the top. Back/Next navigation. Final step submits to the `leads` table.

#### 2. Update `leads` table with new columns
Add a migration with optional columns to store quiz data:
```sql
ALTER TABLE public.leads
  ADD COLUMN budget_range text,
  ADD COLUMN timeline text,
  ADD COLUMN business_type text,
  ADD COLUMN website_url text;
```
These are all nullable, so existing leads and the simple contact form are unaffected.

#### 3. Update homepage CTA
Change the "Get in Touch" button (or add a primary CTA) to link to `/get-started` instead of `/contact`. The hero could become:
- Primary CTA: **"Get Started"** → `/get-started`
- Secondary CTA: **"Explore Services"** → `/services`

#### 4. Add route to `App.tsx`
Add `/get-started` as a public route inside the `<Layout>` wrapper, lazy-loaded.

#### 5. Add page meta
Add a `/get-started` entry to `PAGE_META` in constants for SEO.

### Design
- Matches existing dark/neon aesthetic with `glass-card` panels
- Framer-motion slide transitions between steps
- Purple glow for AI services, blue glow for others (consistent with contact form)
- Mobile-responsive: single-column cards on small screens

### File changes
| File | Change |
|---|---|
| `src/pages/GetStarted.tsx` | New — multi-step quiz component |
| `src/lib/constants.ts` | Add PAGE_META entry for `/get-started` |
| `src/pages/Index.tsx` | Update hero CTA to link to `/get-started` |
| `src/App.tsx` | Add lazy route for `/get-started` |
| Migration | Add `budget_range`, `timeline`, `business_type`, `website_url` columns to `leads` |

