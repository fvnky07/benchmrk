# Issues — create-workout-flow

## [2026-03-14] Session ses_31400c66dffeI2g0LNmXFO6wjI — Plan setup

### Known Pre-existing Issues
- `apps/native/components/ui/pin-input.tsx` line 85 has a TS error unrelated to this feature — do not fix, do not introduce more
- README references `eslint-config` package that doesn't exist — this is pre-existing, ignore

### Constraints
- Convex runtime is NOT Node.js — no Node APIs without polyfills (see `polyfills.ts`)
- `@shopify/flash-list` v2.0.2 is installed but has known React 19 compatibility considerations — use with standard list patterns
- NativeWind 4.2.1 uses Tailwind 3.4, NOT Tailwind 4 — `className` syntax follows Tailwind 3 conventions
- React Compiler is enabled in `app.json` — this may affect memoization patterns; rely on hooks rather than `useMemo`/`useCallback` where possible
