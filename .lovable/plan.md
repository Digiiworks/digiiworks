

## Animated Rotating Border Gradient

The user wants the gradient border on the auth card to smoothly rotate/animate around the rectangle, creating a flowing neon border effect.

### Approach

1. **Add a `@keyframes rotate-border` animation** in `src/index.css` that rotates from 0deg to 360deg
2. **Create a new `.glass-card-animated` class** (or modify `.glass-card`) that uses a `conic-gradient` on the `::before` pseudo-element with the rotation angle driven by a CSS custom property animated via `@property`
3. Since `@property` + CSS Houdini is the cleanest way to animate gradient angles, we'll use that approach:
   - Define `@property --border-angle` 
   - Animate it from `0deg` to `360deg`
   - Use `conic-gradient(from var(--border-angle), ...)` on the `::before` mask border

### Changes

**`src/index.css`**:
- Add `@property --border-angle` declaration for animatable angle
- Add `@keyframes rotate-gradient` spinning 0deg → 360deg
- Update `.glass-card::before` to use `conic-gradient(from var(--border-angle), neon-blue, neon-purple, transparent, neon-blue)` with the animation applied

This keeps the existing glass-card look but adds a smooth perpetual rotation of the gradient border colors around the card perimeter.

