

## Performance and Security Improvements

### Security Fixes (Critical)

**1. Fix profiles table RLS policy** — The security scan found that ALL authenticated users can read every user's sensitive profile data. Replace the permissive SELECT policy with:
- Users can read their own profile (`auth.uid() = user_id`)
- Admins can read all profiles via `has_role()`

**2. Enable leaked password protection** — Turn on the built-in leaked password check in auth config so users can't sign up with compromised passwords.

**3. Fix permissive RLS policies** — Audit and tighten any INSERT/UPDATE/DELETE policies that use `USING (true)` or `WITH CHECK (true)`.

**4. Add security headers** — Update `nginx.conf` with:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (basic restrictive policy)
- `Permissions-Policy` to disable camera/mic/geolocation
- `Strict-Transport-Security` (HSTS)

**5. Add `rel="noopener noreferrer"` audit** — Already present on Footer links; verify all external links across the site.

### Performance Improvements

**1. Optimize ConstellationBg canvas** — The homepage runs a canvas particle animation on every frame. Improvements:
- Reduce particle count further on low-end devices
- Use `OffscreenCanvas` where supported or throttle to 30fps on mobile
- Skip rendering when tab is not visible (`document.hidden`)

**2. Lazy-load heavy homepage sections** — The Index page eagerly renders ConstellationBg, HeroOrbs, AgentPreview, LatestArticles, AgencyPulse, TechMarquee, and StatsBar all at once. Wrap below-the-fold sections (AgentPreview, LatestArticles, AgencyPulse) in intersection-observer-based lazy wrappers so they only mount when scrolled into view.

**3. Preload critical assets** — Add `<link rel="preload">` for the logo SVG and Inter/JetBrains Mono fonts in `index.html` to reduce render-blocking.

**4. Optimize font loading** — Switch Google Fonts import to use `font-display: swap` (add `&display=swap` — already present) and preconnect to `fonts.googleapis.com` / `fonts.gstatic.com`.

**5. Image optimization** — Add `loading="lazy"` and explicit `width`/`height` to blog images and any other `<img>` tags to prevent layout shift and defer offscreen images.

**6. QueryClient stale time** — Set a default `staleTime` (e.g. 5 minutes) on the QueryClient to avoid redundant refetches on navigation.

### Summary of Changes

| Area | Files |
|------|-------|
| DB migration | Fix profiles RLS policy, audit other permissive policies |
| Auth config | Enable leaked password protection |
| nginx.conf | Add security headers |
| index.html | Add preconnect + preload hints |
| ConstellationBg.tsx | Throttle/pause when hidden, reduce mobile work |
| Index.tsx | Lazy-load below-fold sections |
| App.tsx | Set QueryClient defaults |

