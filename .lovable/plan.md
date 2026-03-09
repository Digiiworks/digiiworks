

## Reusable Components & Efficiency Plan

After auditing all admin pages, I found several repeated patterns that can be extracted into shared components:

### 1. Reusable Delete Confirmation — Already Done (ConfirmDialog)
Clients, Products, and Invoices still use inline `AlertDialog` markup instead of the shared `ConfirmDialog`. These should be migrated.

### 2. Summary Stat Card Component
Every admin page (Leads, Invoices, Products, Clients, Dashboard) repeats the same card markup:
```text
<div className="rounded-lg border border-border bg-card/50 p-4">
  <p className="font-mono text-[10px] uppercase...">Label</p>
  <p className="font-mono text-2xl font-bold...">Value</p>
</div>
```
Extract a `StatCard` component with props: `label`, `value`, `valueColor`, `subtitle`, `icon`, `onClick`, `variant` (for alert styling like the overdue card).

### 3. Admin Page Toolbar
Every page has the same toolbar layout — title left, search + filters + action button right:
```text
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <h1>Title</h1>
  <div className="flex flex-wrap gap-2">...controls...</div>
</div>
```
Extract an `AdminToolbar` component: `title` + `children` (for the right-side controls).

### 4. Pagination Component
Clients, Products, and Invoices all duplicate identical pagination markup (~20 lines each). Extract a shared `Pagination` component with props: `page`, `totalPages`, `totalItems`, `pageSize`, `onPageChange`.

### 5. Empty State Component
Multiple pages repeat the pattern:
```text
<div className="py-16 text-center">
  <Icon className="mx-auto h-10 w-10 text-muted-foreground/30" />
  <p className="mt-3 font-mono text-sm text-muted-foreground">No X found.</p>
</div>
```
Extract an `EmptyState` component: `icon`, `message`.

### 6. Loading Spinner
Every page uses: `<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>`
Extract a `PageLoader` component (the one in App.tsx already exists but isn't shared).

### 7. Migrate Remaining Inline AlertDialogs
Replace inline `AlertDialog` in `Invoices.tsx`, `Products.tsx`, and `Clients.tsx` with the shared `ConfirmDialog`.

### Summary of Changes

| Component | New File | Pages Affected |
|-----------|----------|----------------|
| `StatCard` | `src/components/admin/StatCard.tsx` | Dashboard, Leads, Invoices, Products, Clients |
| `AdminToolbar` | `src/components/admin/AdminToolbar.tsx` | All admin pages |
| `AdminPagination` | `src/components/admin/AdminPagination.tsx` | Invoices, Products, Clients |
| `EmptyState` | `src/components/admin/EmptyState.tsx` | All admin pages |
| `PageLoader` | `src/components/admin/PageLoader.tsx` | All admin pages |
| Migrate to `ConfirmDialog` | — | Invoices, Products, Clients |

This will remove ~200+ lines of duplicated markup across the admin section and make future changes (e.g. styling tweaks) a single-file update.

