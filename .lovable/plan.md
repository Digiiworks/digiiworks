

## Homepage Redesign — Modern & Dynamic

The current homepage is functional but flat: hero text + 3 cards + terminal widget. Here's a plan to make it visually striking and modern while keeping the neon-dark identity.

### What Changes

**1. Hero Section Overhaul**
- Add a large animated counter/stats bar below the tagline showing key metrics (e.g., "50+ Projects", "24/7 Uptime", "3 AI Agents") with counting-up animation on load
- Add a subtle animated gradient orb/blob behind the hero text using framer-motion (slow floating radial gradients in blue/purple) for depth
- Make the subtitle text slightly larger with a typewriter-style reveal effect for the tagline line

**2. Pillar Cards — Visual Upgrade**
- Add an icon to each pillar card (using lucide-react icons: `Code2` for Architecture, `TrendingUp` for Growth, `Bot` for Autonomous)
- Add a colored top-border accent line matching each pillar's glow color
- Add a subtle hover glow intensification effect (increase boxShadow on hover)
- Show a small arrow icon that slides right on hover

**3. New "Trusted Tech Stack" Marquee Section**
- A horizontally scrolling row of tech/tool logos or names (React, n8n, Supabase, Vercel, etc.) in muted monospace text — adds visual rhythm and credibility between the pillar cards and the terminal

**4. New "Meet the Agents" Preview Section**
- Below the pillar cards, add a compact horizontal row showing the 4 AI agents (Dex, Vantage, Pixel, Forge) as small glass-cards with their name, role, and colored dot — links to `/ai` page
- Staggered scroll-reveal animation

**5. AgencyPulse Terminal — Polish**
- Add a section heading above the terminal: `// live_feed` in mono label style
- Slightly increase terminal height for more breathing room

### Files Modified

- **`src/pages/Index.tsx`** — Restructure with new sections: animated hero blobs, stats bar, tech marquee, agent preview row, improved pillar cards
- **`src/components/HeroOrbs.tsx`** (new) — Floating gradient orb component using framer-motion
- **`src/components/StatsBar.tsx`** (new) — Animated counting stats row
- **`src/components/TechMarquee.tsx`** (new) — Infinite scrolling tech stack names
- **`src/components/AgentPreview.tsx`** (new) — Compact agent cards row for homepage
- **`src/lib/constants.ts`** — Add `PILLAR_ICONS` mapping and `STATS` array, `TECH_STACK` list
- **`src/index.css`** — Add marquee keyframe animation

### Layout Order (top to bottom)

```text
┌─────────────────────────────────┐
│  ConstellationBg + HeroOrbs     │
│  ───────────────────────────    │
│  // autonomous digital agency   │
│  Build. Automate. Dominate.     │
│  [subtitle]                     │
│  [CTA buttons]                  │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 50+  │ │ 24/7 │ │  3   │    │
│  │Projts│ │Uptime│ │Agents│    │
│  └──────┘ └──────┘ └──────┘    │
├─────────────────────────────────┤
│  Pillar Cards (with icons +     │
│  colored top border + arrow)    │
├─────────────────────────────────┤
│  ← React  n8n  Supabase  →     │
│  (scrolling marquee)            │
├─────────────────────────────────┤
│  Meet the Agents (4 mini cards) │
├─────────────────────────────────┤
│  // live_feed                   │
│  [AgencyPulse Terminal]         │
└─────────────────────────────────┘
```

All new sections use `glass-card`, staggered `whileInView` animations, and the existing neon color palette. No new dependencies required.

