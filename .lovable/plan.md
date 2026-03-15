

## Plan: Dynamic Typewriter Agent Tasks with Rotating Messages

### What we're building
Each agent row in the Agency Pulse terminal will have a typewriter effect that types out the task character by character, followed by a pulsing ` . . .` indicator. Every 5-15 seconds, each agent's task randomly changes to a new one (from a pool of 5 tasks per agent), with the typewriter effect replaying.

### Changes

**1. `src/lib/constants.ts`** — Replace `MOCK_AGENT_LOGS` with a new `AGENT_TASKS` map giving each agent 5 rotating tasks:

```ts
export const AGENT_TASKS: Record<string, string[]> = {
  Dex: [
    'Analyzing new lead from digiiworks.co',
    'Scheduling follow-up for qualified lead #0847',
    'Onboarding new client — sending welcome sequence',
    'Qualifying inbound inquiry from LinkedIn',
    'Booking discovery call for enterprise prospect',
  ],
  Vantage: [
    "Scraping SEO trends for 'AI Automation 2026'",
    'Monitoring competitor ranking shifts on Google',
    'Indexing 14 new backlink opportunities',
    'Analyzing keyword gaps for Q2 content plan',
    'Auditing site speed metrics across 3 domains',
  ],
  Forge: [
    'Deploying system update to KVM 2 node',
    'Rotating SSL certificates for 5 client domains',
    'Scaling container resources — traffic spike detected',
    'Running automated backup for production database',
    'Patching security vulnerability in edge proxy',
  ],
  Pixel: [
    'Generating social assets for Q1 campaign',
    'Rendering carousel visuals for Instagram post',
    'Creating blog header graphic — AI Trends article',
    'Exporting branded deck slides for client pitch',
    'Designing email banner for product launch',
  ],
};
```

**2. `src/components/AgencyPulse.tsx`** — Full rewrite of the log display logic:

- Define a fixed agent order: `['Dex', 'Vantage', 'Forge', 'Pixel', 'Dex']` (5 rows as currently shown).
- Each row tracks its own state: current task index, characters typed so far, and a timer for the next rotation.
- **Typewriter effect**: An interval types one character every ~30ms until the full message is shown.
- **Pulsing dots**: Once fully typed, show ` . . .` with a CSS pulse animation.
- **Random rotation**: After 5-15 seconds (random per row), pick a new random task (different from current), reset typed chars to 0, and replay the typewriter.
- Initial staggered appearance remains (rows appear one by one on mount with 500ms delay).

### Technical approach
- Use a single `useEffect` with `setInterval` (~30ms) driving all typewriter states via `useRef` to avoid re-render storms. Only call `setState` when the visible output actually changes (batch per frame).
- Each row's rotation timer is tracked independently with random intervals.
- Keep the existing Supabase query as a fallback but primarily use the new `AGENT_TASKS` constant for the dynamic display.

