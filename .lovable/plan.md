

## Root Causes

1. **Top-level Suspense** (App.tsx line 61) wraps *everything* including Layout. When any lazy page loads, the entire screen (Navbar, Footer included) is replaced by a spinner — feels like a full reload.

2. **AnimatePresence mode="wait"** in Layout.tsx forces the old page to fully exit (~300ms) before the new page enters — adding visible blank time on every navigation.

3. **All pages are lazy-loaded**, including the 5 main nav pages users visit constantly. Each navigation triggers a chunk fetch + spinner.

## Changes

### 1. Eagerly import main nav pages (`src/App.tsx`)
Convert `Index`, `Services`, `Blog`, `Contact`, `GetStarted`, `AIAutomation` from `lazy()` to direct imports. These are visited most — they should be in the main bundle and load instantly. Keep lazy loading for admin, auth, and detail pages.

### 2. Move Suspense inside Layout (`src/components/Layout.tsx`)
Wrap only `<Outlet />` in `<Suspense>`, not the entire app. Navbar and Footer stay visible at all times — no more disappearing header.

### 3. Remove exit animation, simplify transition (`src/components/Layout.tsx`)
- Remove `AnimatePresence mode="wait"` (blocks rendering during exit).
- Use a simple 150ms fade-in only — no exit animation, no `y` movement.

### 4. Remove outer Suspense (`src/App.tsx`)
Keep a lightweight Suspense only around routes outside Layout (auth, admin) so those still have a fallback.

### Result
- Main pages load instantly (no spinner, no chunk fetch)
- Navbar/Footer never disappear
- Page transitions take 150ms instead of 600ms+
- Lazy pages (admin, auth) show content-area-only spinner

