

## Sitemap Status and Improvement Plan

### Current State
`public/sitemap.xml` exists with 5 static URLs: `/`, `/services`, `/ai`, `/blog`, `/contact`.

### Missing Routes
- `/get-started`
- `/privacy`, `/terms`
- Individual service pages (`/services/custom-web-development`, etc.)
- Individual blog post pages (`/blog/:slug`)
- `/contact` is included but `/get-started` is not

### Proposed Improvements

1. **Update static `sitemap.xml`** to include all known static routes (`/get-started`, `/privacy`, `/terms`, and all service detail pages from `service-pages.ts`).

2. **Create a backend function to generate a dynamic sitemap** that pulls published blog post slugs from the database, so new articles are automatically included without manual edits.

3. **Add a `/sitemap.xml` route** or keep the static file updated via the edge function approach -- the edge function would regenerate and return XML on demand, covering all blog posts dynamically.

### Technical Approach
- **Edge function `generate-sitemap`**: Queries the `posts` table for published slugs, merges with hardcoded static routes, returns XML.
- **Alternative (simpler)**: Just update the static file now with all known routes and manually add blog posts. Less maintenance but no automation.

The dynamic approach is recommended since blog content changes frequently.

