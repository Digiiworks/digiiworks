

## OpenGraph & Social Sharing Cards — All Pages

### Current State
- `index.html` has static OG/Twitter tags but the og:image uses an expiring Google Storage URL
- `PageMeta.tsx` dynamically sets `og:title`, `og:description`, `og:url`, and `description` per route — but is **missing** `twitter:title`, `twitter:description`, `og:type`, `og:image`, `og:site_name`, and `twitter:image`
- Blog posts (`BlogPost.tsx`) have JSON-LD but no OG/Twitter meta tag updates
- Since this is a client-side SPA, social crawlers only see `index.html` static tags. The dynamic `PageMeta` updates help for Google but **not** for Facebook/Twitter/LinkedIn crawlers that don't execute JS

### Plan

#### 1. Clean up `index.html` static defaults
- Remove duplicate meta tags (lines 52-55 duplicate earlier ones)
- Set a permanent `og:image` URL using `https://digiiworks.co/og-image.png` (already exists in `/public`)
- Ensure all base tags are present: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`

#### 2. Enhance `PageMeta.tsx` to set full social tags dynamically
Update the `setMeta` calls to also manage:
- `og:type` — `"website"` for pages, `"article"` for blog posts
- `og:image` — default to `/og-image.png`, use `featured_image` for blog posts
- `og:image:width` / `og:image:height`
- `og:site_name` — `"Digiiworks"`
- `twitter:card` — `"summary_large_image"`
- `twitter:title`, `twitter:description`, `twitter:image`

Extend the component to accept optional props (`image`, `type`) or extend `PAGE_META` to include an optional `image` field. For blog posts, handle separately (see step 3).

#### 3. Add social meta tags to `BlogPost.tsx`
After fetching the post, dynamically set all OG + Twitter tags using the same `setMeta` helper pattern:
- `og:type` = `"article"`
- `og:image` = `post.featured_image` (fallback to default)
- `twitter:image` = same
- `og:title` / `twitter:title` = post title
- `og:description` / `twitter:description` = excerpt or first 160 chars of content

Extract the `setMeta` helper into a shared utility (`src/lib/seo.ts`) so both `PageMeta` and `BlogPost` can use it.

#### 4. File changes summary
| File | Change |
|---|---|
| `index.html` | Clean duplicates, use permanent og-image URL |
| `src/lib/seo.ts` | New — shared `setMeta` + `updateSocialMeta` helper |
| `src/components/PageMeta.tsx` | Use shared helper, add all OG + Twitter tags |
| `src/pages/BlogPost.tsx` | Call `updateSocialMeta` with post-specific data after fetch |

### Important Note
Social crawlers (Facebook, Twitter, LinkedIn) typically do **not** execute JavaScript — they only read the static HTML. For full per-page social cards, you would need server-side rendering or a prerendering service. This implementation ensures the best possible client-side coverage and correct static defaults in `index.html`.

