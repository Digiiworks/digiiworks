

## Plan: Multi-Business Clients with Fuzzy Email Search

### Current State
- Each client has a single `company` field on the `profiles` table
- Creating a client with an existing email fails because the edge function tries to create a duplicate auth user

### What Changes

**1. New `client_companies` table** (database migration)

Stores multiple businesses per user:
- `id`, `user_id`, `company_name`, `address`, `currency`, `phone`, `notes`, `active`, `created_at`, `updated_at`
- RLS: admins manage all, clients view own
- Invoices and recurring services will reference `client_company_id` instead of just `client_id`

**2. Add `client_company_id` to existing tables** (migration)

- Add nullable `client_company_id` column to `invoices` and `client_recurring_services`
- This links invoices/services to a specific business rather than just the user

**3. Update `create-client` edge function**

- Accept an optional `existing_user_id` parameter
- If `existing_user_id` is provided: skip auth user creation, just insert a new `client_companies` row and ensure client role exists
- If not provided: create auth user as before, then insert the company row
- Handle "user already registered" error gracefully by returning the existing user ID so the admin can link them

**4. Update `Clients.tsx` - Create Dialog**

- Replace the plain email input with a fuzzy search combobox
- As admin types an email, query existing profiles for matches (using `ilike` with `%query%`)
- Show dropdown of matching users with name + email + existing companies
- If admin selects an existing user: pre-fill name/phone, set `existing_user_id`, only require new company details
- If no match selected: proceed with new user creation as before

**5. Update `Clients.tsx` - List & Edit**

- Fetch from `client_companies` joined with profiles to show one row per company (not per user)
- Edit dialog shows company-specific fields from `client_companies`
- Display which user the company belongs to

**6. Update Client Dashboard & Invoice flows**

- When creating invoices, select the specific company (not just user)
- Invoice detail and emails show the company from `client_companies`

### Technical Details

```text
profiles (1) ──< client_companies (many)
                    │
                    ├── company_name
                    ├── address  
                    ├── currency
                    ├── phone
                    ├── notes
                    └── active

invoices.client_company_id ──> client_companies.id
client_recurring_services.client_company_id ──> client_companies.id
```

Migration SQL will:
1. Create `client_companies` table with RLS
2. Add `client_company_id` to `invoices` and `client_recurring_services`
3. Migrate existing profile company data into `client_companies` rows
4. Keep `client_id` (user_id) on invoices for backward compatibility

The fuzzy search in the create dialog will query profiles with `ilike` on email/display_name and show results in a dropdown, similar to the existing `ProductCombobox` pattern.

