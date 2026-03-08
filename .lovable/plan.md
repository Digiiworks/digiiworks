

## Custom 404 Page — Neon Dark Theme

Replace the current plain 404 page with a styled version matching the site's neon-dark aesthetic.

### Changes

**`src/pages/NotFound.tsx`** — Full redesign:
- Dark background with `grid-overlay` pattern (matching ErrorBoundary style)
- Glitchy "404" heading using `text-gradient` and `font-mono`
- Pulsing status indicator (neon-mint dot with `animate-ping`) showing "Route Not Found"
- Display the attempted path using `useLocation().pathname` in a mono-styled code block
- Subtitle text in `text-muted-foreground`
- "Return to Base" button styled with `glow-blue` and primary colors (matching ErrorBoundary's button pattern)
- `glass-card` container for the content block
- Wrap in the `Layout` component by moving the `*` route inside the Layout route group in `App.tsx`

**`src/App.tsx`** — Move the catch-all route inside the `<Route element={<Layout />}>` group so the 404 page gets the navbar and footer.

