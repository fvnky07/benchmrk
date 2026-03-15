# Active Workout — Learnings

## [2026-03-15T00:44:46Z] Session Start

### Codebase Conventions
- **Styling**: NativeWind `className` ONLY — NO `StyleSheet.create`
- **State**: Zustand v5.0.11 — use `create<Store>()` with explicit interface + actions
- **Convex auth**: `ctx.auth.getUserIdentity()` → `identity.subject` (string userId)
- **Convex errors**: `ConvexError('CODE')` for client errors, `Error()` for server/validation
- **Card style**: `rounded-2xl border border-white/10 bg-black-3 px-4 py-4`
- **Loading**: `ActivityIndicator size="large" color="#00ff90"` + `Text className="mt-4 text-white/60"`
- **Toast**: `showToast.success(title, msg)` / `showToast.error(title, msg)` from `@/lib`
- **Haptics**: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` from `expo-haptics`
- **Colors**: bg-black-1 (#151515) screens, bg-black-2 (#252525) secondary, bg-black-3 (#303030) cards, green-1 (#00ff90) accent
- **Avatar**: `AvatarImage` + `AvatarFallback` from `@/components/ui/avatar`
- **Header customization**: `navigation.setOptions({ headerLeft, headerTitle, headerRight })` in `useEffect`

### Critical Constraints
- `NativeTabs.BottomAccessory` does NOT exist in SDK 54 → use `@rn-primitives/portal`
- `@expo/ui BottomSheet` API for v0.2.0-beta.9: `isOpened`/`onIsOpenedChange` (NOT `isPresented`)
- Import path: `from '@expo/ui/swift-ui'` (NOT from `@expo/ui` root)
- `exerciseType` added as `v.optional()` — existing exercise rows lack this field
- Table is named `sessionSets` (NOT `sets`) to avoid collision with `workoutExercises.sets` number field
- Minimize button calls `router.replace('/(main)')` — does NOT call `router.back()` or end session
- AsyncStorage pkg: `@react-native-async-storage/async-storage` (must `expo install` it)

### Barrel Pattern
- `lib/index.ts` re-exports everything from subdirs
- `lib/workout/index.ts` re-exports all workout-related items
- `components/workout/index.ts` barrel for workout components
- New files MUST be exported through both their subdir barrel AND root barrel

### Worktree
- Path: `/Users/fvnky/Projects/benchmrk-active-workout`
- Branch: `native/active-workout`
- ALL code changes go in this worktree

## [2026-03-15] sessionExercises.ts

### Backend Type Check
- `@repo/backend` has NO `tsconfig.json` and NO `check-types` script
- `pnpm turbo run check-types --filter=@repo/backend` exits 0 (0 tasks executed) — this is expected
- Convex type checking happens at `convex dev` / `convex deploy` time via generated types
- LSP errors on `convex/values` are pre-generation artifacts — not real errors

### sessionExercises patterns
- `by_session_order` index used for ordered query (returns already ordered)
- `by_session` index used for count-only queries (auto-order)
- `ConvexError('SESSION_NOT_ACTIVE')` for status guard
- `Promise.all` + spread pattern for join: `{ ...se, exercise }`
- Filter `r.exercise !== null` after join (defensive against deleted exercises)

## [2026-03-15] workoutSessions.ts Created

### Type Check Findings
- `@repo/backend` has NO `check-types` script in package.json — turbo runs 0 tasks
- `tsc` not available in PATH or node_modules for this package
- LSP errors on `convex/values` import are false positives — same errors exist in working `workouts.ts`
- `_generated/dataModel.d.ts` derives types from `schema.ts` directly via `DataModelFromSchemaDefinition<typeof schema>` — no regeneration needed for schema changes

### workoutSessions.ts Patterns
- `by_user_status` index used for concurrent session check: `.withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active'))`
- `durationSeconds` computed inline: `Math.floor((completedAt - session.startedAt) / 1000)`
- `abandonSession` patches `status: 'abandoned'` + `completedAt` — does NOT delete
- `getActiveSession` returns `null` (not throws) when unauthenticated — query pattern
- `getSession` ownership check: `session.userId !== identity.subject` → return null

## [2026-03-15] sessionExercises.ts hardening

### Mutation guards
- `addExerciseToSession` should verify the referenced exercise exists before insert and throw `ConvexError('EXERCISE_NOT_FOUND')`
- `reorderExercises` should verify every `orderedId` belongs to the provided session before patching order fields

### Query/mutation patterns
- Ordered reads can rely on `by_session_order` and still use a join pass with `Promise.all`
- Ownership checks stay anchored on the parent `workoutSessions` row even when mutating `sessionExercises`

## [2026-03-15] workoutSessions.ts Verification

### Verification Findings
- `packages/backend/convex/workoutSessions.ts` already matched the required 5-function lifecycle implementation in the active-workout worktree
- LSP diagnostics for `workoutSessions.ts` were clean
- `pnpm turbo run check-types --filter=@repo/backend` exits 0 but executes 0 tasks for `@repo/backend` in this repo

## [2026-03-15] sessionSets.ts

### sessionSets patterns
- `logSet` must verify parent session ownership and `session.status === 'active'` before marking a set complete
- `sessionId` denormalization enables direct `.withIndex('by_session', q => q.eq('sessionId', args.sessionId))` queries without joining through `sessionExercises`
- Backend verification remains `pnpm turbo run check-types --filter=@repo/backend` → exit 0 with 0 tasks executed in this package

## [2026-03-15] schema.ts active workout schema verification

### Schema Findings
- `packages/backend/convex/schema.ts` already contains the requested `workoutSessions`, `sessionExercises`, and `sessionSets` tables in the active-workout worktree
- `exercises` already includes optional `exerciseType`, `isCustom`, and `createdBy` fields with `v.optional(...)`
- `sessionSets` is correctly named and indexed by both `sessionExerciseId` and `sessionId`

### Verification
- LSP diagnostics for `packages/backend/convex/schema.ts` are clean
- `pnpm turbo run check-types --filter=@repo/backend` exits 0 with 0 tasks executed in this repo setup

## Workout Timer & Session API Implementation
- Implemented `useWorkoutTimer` hook using `Date.now()` delta for accuracy across backgrounding/navigation.
- Added `AppState` reconciliation to the timer hook to ensure immediate sync when returning to the app.
- Created `session-api.ts` following the `makeFunctionReference` pattern for type-safe Convex function calls.
- Centralized session-related types (`WorkoutSession`, `SessionExercise`, `SessionSet`) in the API reference file.
- Verified that new files do not introduce new type errors in `@native/app`.

### Zustand Active Session Store
- Successfully installed `@react-native-async-storage/async-storage` using `npx expo install`.
- Implemented `useActiveSessionStore` with `persist` middleware.
- Configured `partialize` to only persist crash-recovery fields (`activeSessionId`, `sessionStartTimestamp`, `sessionName`), keeping UI state (`currentExerciseIndex`) in memory only.
- Verified that `AsyncStorage` is the correct storage engine for React Native persistence.

- When building type-aware components that render different inputs based on a type prop, use a switch statement inside a render function to keep the JSX clean and readable.
- Use `expo-haptics` for subtle feedback on user actions like completing a set.

## [2026-03-15] ExercisePicker Implementation
- `@expo/ui` v0.2.0-beta.9 `BottomSheet` uses `isOpened` and `onIsOpenedChange` props, not `isPresented`.
- `BottomSheet` requires `presentationDetents` and `presentationDragIndicator` as direct props.
- To avoid Android crashes with `@expo/ui/swift-ui`, use a lazy import inside a `Platform.OS === 'ios'` check: `const { BottomSheet } = require('@expo/ui/swift-ui');`.
- For Android fallback, use React Native's `Modal` with `presentationStyle="pageSheet"`.
- `@shopify/flash-list` v2 does NOT require the `estimatedItemSize` prop. It automatically handles item sizing.
