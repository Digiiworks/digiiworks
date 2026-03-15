

## Problem
On mobile, the hero section's "Autonomous Digital Agency" label is hidden behind the navbar when the page loads. The hero uses `min-h-[90vh]` with `items-center justify-center` but has no top padding to account for the fixed/sticky navbar.

## Fix
Add top padding to the hero `<section>` so content clears the navbar on mobile. The navbar is roughly 64px tall.

**File:** `src/pages/Index.tsx` — line 26

Change:
```tsx
<section className="relative z-10 flex min-h-[90vh] items-center justify-center px-6">
```
To:
```tsx
<section className="relative z-10 flex min-h-[90vh] items-center justify-center px-6 pt-20 sm:pt-16">
```

`pt-20` (80px) on mobile gives enough clearance above the navbar. `sm:pt-16` relaxes it on larger screens where the centered layout has more vertical room.

