# Learnings — create-workout-flow

## [2026-03-14] Session ses_31400c66dffeI2g0LNmXFO6wjI — Plan setup

### Key Conventions (from codebase research)

**Routing**
- Expo Router file-based, native stack in `apps/native/app/(main)/workout/_layout.tsx`
- `router.push()` for step navigation, `router.replace()` for final destination after save
- `unstable_settings.initialRouteName` needed for deep-link back-stack safety

**State Management**
- Zustand stores for cross-screen state — follow `apps/native/lib/auth/store.ts` pattern
- `create<Store>((set) => ({ ... }))` with reset action
- Local `useState` for form inputs; Zustand for cross-step persistence

**Convex Backend**
- Auth: `ctx.auth.getUserIdentity()` → `identity.subject` as userId (NEVER use `getAuthUserId` from @convex-dev/auth)
- Schema-first: define in `schema.ts`, `convex dev` auto-generates types
- Query/mutation pattern: `import { mutation, query } from './_generated/server'` + `v` validators
- Free-tier enforcement: `.take(FREE_TIER_LIMIT + 1)` NOT `.collect()`
- Relationship join tables with indexes `by_workout`, `by_exercise`, `by_workout_exercise`
- Seed: `internalMutation` in `packages/backend/convex/init.ts`, idempotent, NOT public mutation

**Testing (CRITICAL — different runners!)**
- `packages/backend/`: Vitest + `convex-test` + `@edge-runtime/vm` (NEVER Jest in backend)
- `apps/native/`: Jest + `jest-expo` + `@testing-library/react-native` (NEVER Vitest in native)

**UI/Styling**
- NativeWind `className` ONLY — never `StyleSheet.create` or inline styles
- Green accent: `#00ff90` / `text-green-1` class
- Dark background: `#151515` header, `bg-black-1` screens
- Loading: `<ActivityIndicator size="large" color="#00ff90" />`
- Errors: inline View with message text

**Component Patterns**
- Named exports everywhere except page default exports
- Props destructured in function signature
- `SettingsRow` pattern: `icon`, `label`, `rightLabel`, `onPress`, `hasBorder`
- Lists: `@shopify/flash-list` already installed — use `FlashList` instead of `FlatList`

**Barrel Exports**
- `lib/index.ts` re-exports ALL subdirs — add new features there
- Feature modules under `lib/{feature}/index.ts`

**Worktree**
- Feature branch: `feat/create-workout-flow`
- Worktree path: `/Users/fvnky/Projects/benchmrk-workout-flow`
- All changes go in the worktree

## [2026-03-14] Task 2 — Native Test Infrastructure

### Jest + jest-expo Setup (CRITICAL)

**Working Configuration:**
- `jest.config.js` with custom Babel transform (NOT preset: 'jest-expo')
- jest-expo's preset setup.js uses ESM which breaks in Node test environment
- Solution: Use `babel-jest` with `babel-preset-expo` directly in transform

**jest.config.js Pattern:**
```js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@rn-primitives)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
```

**Dependencies Installed:**
- `jest@^30.3.0`
- `jest-expo@^55.0.9`
- `@types/jest@^30.0.0`
- `@testing-library/react-native@^13.3.3`
- `@testing-library/jest-native@^5.4.3`

**TypeScript Config:**
- Add `"types": ["jest", "@testing-library/jest-native"]` to compilerOptions
- Allows `describe`, `it`, `expect` without imports

**Test File Location:**
- `apps/native/__tests__/smoke.test.ts` — simple assertions, no rendering
- Pattern: `__tests__/**/*.test.ts?(x)`

**Lint Status:**
- Pre-existing warnings in `app/_layout.tsx`, `HeatmapPlaceholder.tsx`, `pin-input.tsx`
- No new lint errors from test infrastructure

## [2026-03-14] Backend Test Infrastructure Setup

### Vitest + convex-test Configuration

**Key learnings:**
- `convex-test@0.0.41` (NOT 0.1.0) is the latest stable version on npm
- vitest.config.ts must set `environment: 'edge-runtime'` and inline convex-test: `server: { deps: { inline: ['convex-test'] } }`
- Set `root: path.resolve(__dirname, 'convex')` in vitest config to resolve _generated directory correctly
- Use `import.meta.glob<{ default: Record<string, unknown> }>('../_generated/*.js', { eager: true })` to load generated modules
- Biome enforces `node:path` import protocol for Node.js builtins (not just `path`)

**Test file pattern:**
```typescript
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';

const modules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../_generated/*.js',
  { eager: true }
);

test('convex test harness runs', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    expect(ctx.db).toBeDefined();
  });
});
```

**Pre-existing lint warnings in profile.ts** (not introduced by test setup):
- Lines 44, 47: `as any` type assertions in betterAuth profile mutations — pre-existing, do not fix

**Commit:** `chore(backend): add convex test infrastructure` (4d75a8c)

## [2026-03-14] Task 3 — Native Workout State & Schemas

### Zustand Store Pattern (Confirmed)

**Store Shape:**
```typescript
interface WorkoutCreationStore {
  title: string;
  selectedExerciseIds: string[];
  exerciseConfigs: Record<string, { sets: number; reps: number; weight: number }>;
  setTitle: (title: string) => void;
  toggleExercise: (id: string) => void;
  setExerciseConfig: (id: string, config: ExerciseConfig) => void;
  reset: () => void;
}
```

**Key Implementation Details:**
- `toggleExercise` uses `.includes()` check to add/remove from array
- `setExerciseConfig` spreads exerciseConfigs object to maintain immutability
- `reset()` clears all state to initial values: `{ title: '', selectedExerciseIds: [], exerciseConfigs: {} }`
- Follows exact pattern from `lib/auth/store.ts` — `create<Store>((set) => ({ ... }))`

### Zod Schemas

**workoutNameSchema:**
- `z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less')`
- Validates workout title input

**exerciseConfigSchema:**
- `z.object({ sets: z.number().int().min(1), reps: z.number().int().min(1), weight: z.number().min(0) })`
- Validates per-exercise configuration
- All numeric fields required, non-negative

### Barrel Export Pattern

**lib/workout/index.ts:**
```typescript
export { useWorkoutStore } from './store';
export { workoutNameSchema, exerciseConfigSchema } from './schemas';
export type { ExerciseConfig } from './schemas';
```

**lib/index.ts updated:**
- Added `export * from './workout'` at end of file
- Maintains alphabetical/logical grouping with other feature exports

### Test Results

- `pnpm --filter @native/app test` — **PASS** (2 tests, 0.097s)
- No regressions introduced
- Pre-existing type errors in `pin-input.tsx` and `polyfills.ts` unaffected

### Type Checking Status

- New files (`store.ts`, `schemas.ts`, `index.ts`) have **zero LSP errors**
- Pre-existing errors in native app (pin-input, polyfills) are NOT introduced by this task
- Commit: `feat(native): add workout creation state and schemas` (baba214)

## [2026-03-14] Task 6 — Exercise Catalog Seed

### Seed Implementation (init.ts)

**File:** `packages/backend/convex/init.ts`

**Key Details:**
- `internalMutation` (NOT public mutation) — only callable from backend
- 15 exercises covering: push, pull, legs, core movement patterns
- Each exercise has: slug, name, description, category, muscleGroups[], instructions
- **Idempotent:** checks `by_slug` index before inserting each exercise
- Returns object with `{ message, seededCount, totalExercises }`

**Exercise Categories:**
- Push: push-up, bench-press, overhead-press, dip
- Pull: pull-up, bent-over-row, chin-up, lat-pulldown, cable-row
- Legs: squat, deadlift, lunge, romanian-deadlift, leg-press
- Core: plank

**Test Results:**
- `pnpm --filter @repo/backend test` — **PASS** (1 test, 168ms)
- No regressions introduced
- Test output saved to `.sisyphus/evidence/task-6-seed-run.txt`

**Commit:** `feat(backend): seed exercise catalog` (26e3cd8)
## Task 18: Native Integration Tests Evidence
- Updated .sisyphus/evidence/task-18-native-suite.txt with real Jest output.
- Updated .sisyphus/evidence/task-18-negative-paths.txt with logic-level negative paths.
- Verified that the tests cover selection validation, configuration validation, and data fallback.
- Clarified that coverage is at the logic level, not UI/component level.
