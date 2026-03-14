

# Landing Page Redesign — From "AI-Generated" to Premium Agency

## The Problem
The current landing page relies on effects that signal "AI template": rotating conic-gradient borders, canvas particle backgrounds, grid overlays, neon glow shadows, and `// code_comment` labels everywhere. The reference image (Confluent) shows the target aesthetic: deep navy tones, bold gradient typography, generous whitespace, and restrained motion.

## Design Direction
Shift from OLED black + neon effects to a **deep navy palette** with pink-to-purple gradient accents. Kill the visual noise (constellation canvas, grid overlay, rotating borders). Replace with confident typography, layered depth, and smooth Framer Motion animations.

## Color Palette Update (from reference image)

| Token | Current | New |
|-------|---------|-----|
| `--background` | `0 0% 0%` (pure black) | `230 25% 7%` (deep navy) |
| `--card` | `0 0% 4%` | `230 20% 11%` (elevated navy) |
| `--muted` | `0 0% 10%` | `230 15% 16%` |
| `--border` | `0 0% 14%` | `230 15% 18%` |
| `--primary` | `184 100% 50%` (cyan) | `330 85% 65%` (pink, from reference) |
| `--neon-purple` | stays similar | `280 80% 60%` |

The gradient text becomes pink → purple instead of cyan → purple.

## Landing Page Overhaul

### 1. Remove Visual Noise
- **Delete** `ConstellationBg` canvas from Index
- **Delete** `HeroOrbs` floating blurred circles
- **Delete** `grid-overlay` animated data-stream div
- **Delete** gradient overlay div
- Replace with a single subtle radial gradient background (CSS, no canvas)

### 2. Hero Section Redesign
- Much larger heading (text-5xl → text-7xl on desktop)
- Remove `// autonomous digital agency` mono label
- Headline: large pink-gradient text on first line, white on second — like the Confluent reference
- Subtitle: clean Inter font, softer muted color, max-w-lg
- CTAs: "Get Started" as a solid pink button with subtle glow on hover, "Explore Services" as a text link with arrow — clear visual hierarchy
- Entrance: single smooth fade-up with stagger for heading → subtitle → buttons

### 3. Stats Bar
- Keep animated numbers but restyle cards
- Remove `glass-card` rotating border effect → clean bordered cards with subtle bg
- Softer entrance animation

### 4. Pillar Cards
- Remove `// core_services` mono label
- Add a proper section heading: "What We Do" or "Our Services"
- Cards: clean dark surface, solid 1px border, colored left accent line instead of top
- Remove rotating conic-gradient `::before` borders
- Hover: gentle lift + border color shift, no glow shadows
- Smooth staggered entrance with `whileInView`

### 5. Tech Marquee
- Soften opacity, keep marquee but remove harsh edge fades
- Use dots as separators instead of gaps

### 6. Agent Preview
- Remove `// agents_online` mono label → proper heading
- Cards: simpler, cleaner — name and role with colored dot, no glow shadow
- Subtle hover scale

### 7. Latest Articles
- Remove `// latest_articles` mono label → proper heading
- Keep card layout but use new card style (no rotating borders)

### 8. Agency Pulse (Terminal)
- Keep the terminal concept but soften it
- Remove `// live_feed` label
- Cleaner card styling

### 9. CSS Overhaul (`index.css`)
- Update all CSS custom properties to navy palette
- Simplify `.glass-card`: remove `::before` conic gradient, use simple `bg-card border-border` 
- Remove `.glow-blue`, `.glow-purple`, `.glow-mint` utility classes (or make them much subtler)
- Update `.text-gradient` to use pink → purple
- Remove `grid-overlay`, `data-stream`, `rotate-gradient` keyframes
- Keep `marquee-scroll`

### 10. Framer Motion Animations
All sections use smooth, purposeful animations:
- **Hero**: `opacity: 0, y: 40` → `opacity: 1, y: 0`, 0.8s ease-out, children staggered 0.15s
- **Stats**: staggered fade-up per card, 0.1s delay each
- **Pillar cards**: `whileInView` fade-up with 0.15s stagger
- **Agent cards**: `whileInView` scale-in from 0.95
- **Articles**: `whileInView` fade-up with stagger
- Add subtle `whileHover={{ y: -4 }}` on interactive cards
- No spring physics — use `ease: [0.25, 0.1, 0.25, 1]` for refined feel

### 11. Navbar & Footer
- Update to match navy palette (comes from CSS variables, mostly automatic)
- Remove "Engine Active" ping dot from Navbar — too gimmicky
- Footer: remove "All Systems Operational" ping indicator

## Files Changed
1. `src/index.css` — color tokens, remove glass-card `::before`, simplify utilities
2. `src/pages/Index.tsx` — full hero/layout redesign, remove ConstellationBg/HeroOrbs/grid
3. `src/components/StatsBar.tsx` — restyle cards
4. `src/components/AgentPreview.tsx` — cleaner card design
5. `src/components/TechMarquee.tsx` — softer styling
6. `src/components/Navbar.tsx` — remove "Engine Active" indicator
7. `src/components/Footer.tsx` — remove "All Systems Operational" indicator
8. `src/components/LatestArticles.tsx` — use new card style
9. `src/components/AgencyPulse.tsx` — softer terminal styling
10. `tailwind.config.ts` — may not need changes (colors come from CSS vars)

Components that can be deleted or emptied:
- `src/components/ConstellationBg.tsx` — remove import from Index (keep file for other pages if needed)
- `src/components/HeroOrbs.tsx` — remove import from Index

## Scope
This plan covers the **landing page only** as requested. The color/CSS changes will cascade to Navbar, Footer, and other pages automatically. Admin and inner pages will be addressed in follow-up rounds.

