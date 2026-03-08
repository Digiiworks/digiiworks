

## Full Site Audit — Implementation Plan

Based on a thorough codebase review, here are all the improvements grouped by priority.

### 1. Critical SEO Fixes

**robots.txt** — Add sitemap directive:
```
Sitemap: https://digiiworks.co/sitemap.xml
```

**index.html** — Add favicon `<link>` tag and missing `<meta name="robots">` tag.

**Blog pages** — Add JSON-LD `Article` schema to `BlogPost.tsx` and `WebPage` schema to `Blog.tsx`.

**AI page** — Add JSON-LD `WebPage` schema to `AIAutomation.tsx`.

### 2. Performance Optimizations

**ConstellationBg.tsx** — Reduce particles on mobile (30 instead of 60), use `distSquared` comparison instead of `Math.sqrt` to avoid O(n^2) sqrt calls. Add `will-change: transform` to canvas.

**React.lazy route splitting** — Lazy-load all page components in `App.tsx` with a `Suspense` fallback, reducing initial bundle size.

### 3. Accessibility & UX

**Navbar.tsx** — Add `aria-current="page"` to active nav links. Animate the mobile menu open/close with framer-motion instead of instant show/hide. Add logo `alt` text improvement ("Digiiworks — Autonomous Digital Agency").

**Back to top button** — Add a global `ScrollToTop` component that appears on scroll, placed in `Layout.tsx`.

**Breadcrumbs** — Add consistent breadcrumbs to `Blog.tsx`, `BlogPost.tsx`, `AIAutomation.tsx`, and `Contact.tsx` (already present on `ServiceDetail`).

**Loading skeletons** — Replace "Loading..." text in `Blog.tsx` and `BlogPost.tsx` with skeleton pulse cards.

### 4. Code Quality

**Delete `src/components/NavLink.tsx`** — Unused wrapper component, never imported anywhere.

**Remove duplicate Sonner toaster** — The app renders both `<Toaster />` (radix) and `<Sonner />`. Keep only one (Sonner is used via `sonner` package's `toast()`, radix via `useToast`). Since both are used, consolidate: keep both but add a note. Actually, the contact form uses `useToast` (radix). Keep both for now but this is a future cleanup.

### 5. Compliance

**Footer** — Add Privacy Policy and Terms of Service placeholder links.

### Files to Modify

| File | Changes |
|---|---|
| `public/robots.txt` | Add `Sitemap:` directive |
| `index.html` | Add favicon link, robots meta |
| `src/App.tsx` | React.lazy imports + Suspense |
| `src/components/ConstellationBg.tsx` | Mobile particle reduction, sqrt optimization |
| `src/components/Navbar.tsx` | aria-current, animated mobile menu |
| `src/components/Layout.tsx` | Add ScrollToTop button |
| `src/components/ScrollToTop.tsx` | New — back-to-top FAB |
| `src/pages/Blog.tsx` | Breadcrumbs, loading skeletons, JSON-LD |
| `src/pages/BlogPost.tsx` | Breadcrumbs, loading skeleton, Article JSON-LD |
| `src/pages/AIAutomation.tsx` | Breadcrumbs, WebPage JSON-LD |
| `src/pages/Contact.tsx` | Breadcrumbs |
| `src/components/Footer.tsx` | Privacy/Terms links |

**File to delete:** `src/components/NavLink.tsx`

All changes preserve existing styling, glass-card patterns, and neon color system. No new dependencies.

