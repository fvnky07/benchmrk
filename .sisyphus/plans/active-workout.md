# Active Workout Feature

## TL;DR

> **Quick Summary**: Build a fully interactive active workout tracking system — replacing the static `[id]/start.tsx` stub with a live session screen, real-time set logging to Convex, a persistent floating mini-player above the tab bar, and a native exercise picker drawer.
>
> **Deliverables**:
> - 3 new Convex tables (`workoutSessions`, `sessionExercises`, `sessionSets`) + mutations/queries
> - `exerciseType` field added to `exercises` schema
> - Zustand active session store with AsyncStorage crash recovery
> - `useWorkoutTimer` hook (Date.now() delta + AppState reconciliation)
> - 4 new components: `SetRow`, `ActiveExerciseCard`, `ExercisePicker`, `ActiveWorkoutMiniPlayer`
> - Full replacement of `app/(main)/workout/[id]/start.tsx`
> - Mini-player wired into `app/(main)/_layout.tsx` via `@rn-primitives/portal`
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 5 → Task 7 → Task 11 → Task 12

---

## Context

### Original Request
Build active workout functionality: start/log workout to DB, efficient schema, interactive exercise cards with set logging, custom header (timer/minimize/add exercise/complete), floating minimized card above tab bar with cancel, exercise picker drawer, native UI.

### Interview Summary
**Key Discussions**:
- **Timer**: Center of heading; survives navigation via `Date.now()` delta + AppState; persisted `startTimestamp` in Zustand+AsyncStorage for crash recovery
- **Minimize**: Back button navigates away (doesn't end session); session stays alive in Zustand; mini-player floats above tab bar
- **Mini-player**: Shows elapsed time + X cancel button; X shows Alert → `abandonSession` mutation → clear store
- **Exercise picker**: Header "Add Exercise" button → Sheet drawer; pre-seeded library + user customs; search + FlashList
- **Exercise card**: `[image] [name] ............. [+ Add Set] [⋯]` with set rows below
- **Set types**: Exercise-type-aware — strength=weight+reps, bodyweight=reps, cardio=distance+duration, timed=duration
- **State**: Zustand (already in project) + AsyncStorage persist for crash recovery
- **Drawer**: `@expo/ui/swift-ui BottomSheet` (already installed, iOS native) with Modal fallback for Android

**Research Findings**:
- `NativeTabs.BottomAccessory` does NOT exist in SDK 54 — must use `@rn-primitives/portal` (already installed) + absolute-positioned View instead
- `@expo/ui BottomSheet` v0.2.0-beta.9 API: `isOpened`/`onIsOpenedChange` props, `presentationDetents` as direct prop, import from `@expo/ui/swift-ui`
- `@shopify/flash-list` installed — use for exercise list performance
- `expo-haptics` established pattern in `pin-input.tsx` — use for set completion feedback
- Zustand 5.0.11 installed; AsyncStorage NOT installed — need `expo install @react-native-async-storage/async-storage`

### Metis Review
**Identified Gaps** (all auto-resolved):
- `NativeTabs.BottomAccessory` unavailable in SDK 54 → Portal + absolute View via existing `PortalHost`
- `@expo/ui BottomSheet` is iOS-only → platform-guard + Modal fallback for Android
- `exerciseType` not in schema → add as `v.optional()` for backward compat
- Table name `sets` conflicts with `workoutExercises.sets` field → named `sessionSets`
- AsyncStorage not installed → add install step to Task 5
- Concurrent session UX → block with Alert if active session exists (`getActiveSession` check in `startSession`)

---

## Work Objectives

### Core Objective
Transform the static workout stub into a fully functional real-time session tracker — users start, log, and complete workouts with live set tracking logged to Convex, while a persistent mini-player keeps the session visible across the entire app.

### Concrete Deliverables
- `packages/backend/convex/schema.ts` — 3 new tables + `exerciseType` on exercises
- `packages/backend/convex/workoutSessions.ts` — 5 mutations/queries
- `packages/backend/convex/sessionExercises.ts` — 4 mutations/queries
- `packages/backend/convex/sessionSets.ts` — 5 mutations/queries
- `apps/native/lib/workout/active-session-store.ts` — Zustand store
- `apps/native/lib/workout/use-workout-timer.ts` — timer hook
- `apps/native/lib/convex/session-api.ts` — typed Convex API refs
- `apps/native/components/workout/SetRow.tsx`
- `apps/native/components/workout/ActiveExerciseCard.tsx`
- `apps/native/components/workout/ExercisePicker.tsx`
- `apps/native/components/workout/ActiveWorkoutMiniPlayer.tsx`
- `apps/native/app/(main)/workout/[id]/start.tsx` — full replacement
- `apps/native/app/(main)/_layout.tsx` — mini-player integration

### Definition of Done
- [ ] `pnpm turbo run check-types --filter=@repo/backend` passes
- [ ] `pnpm turbo run check-types --filter=@native/app` passes
- [ ] `pnpm turbo run lint --filter=@native/app` passes with 0 errors
- [ ] `npx convex dev` compiles schema without errors
- [ ] Active workout session persists when navigating to another tab
- [ ] Floating mini-player visible above tab bar showing live elapsed time
- [ ] Sets logged to `sessionSets` table in Convex (verified via Convex dashboard)

### Must Have
- Real-time set logging to Convex on every set completion
- Timer that survives navigation and app backgrounding
- Floating mini-player with elapsed time and cancel button
- Exercise picker with search and FlashList for performance
- Type-aware set rows (strength / bodyweight / cardio / timed)
- Haptic feedback on set completion (`expo-haptics`)
- Complete workout button that marks session as `completed` in Convex
- Cancel confirmation alert before abandoning session
- Block starting new session if one is already active

### Must NOT Have (Guardrails)
- ❌ Rest timer UI (countdown between sets)
- ❌ Workout history / past sessions list screen
- ❌ PR (personal record) detection or display
- ❌ Superset / circuit grouping
- ❌ Custom exercise creation (scope to existing catalog + planned user customs from DB)
- ❌ Exercise reordering via drag-and-drop
- ❌ Animated set completion (haptic only — no Lottie/confetti)
- ❌ Apple Health / Strava sync (preferences exist but out of scope)
- ❌ Offline-first / conflict resolution
- ❌ `NativeTabs.BottomAccessory` (NOT in SDK 54 — use Portal)
- ❌ `StyleSheet.create` (use NativeWind `className` exclusively)
- ❌ `_generated/` edits
- ❌ Changes to existing `workoutExercises` table

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (jest + jest-expo)
- **Automated tests**: NO (native UI components, Convex integration — agent QA scenarios are sufficient)
- **Framework**: N/A
- **Agent-Executed QA**: YES — mandatory for every task

### QA Policy
- **Backend**: Bash — `npx convex run <function> '<args>'` + `pnpm turbo run check-types --filter=@repo/backend`
- **Frontend lib**: Bash — `pnpm turbo run check-types --filter=@native/app`
- **Components**: Bash — `pnpm turbo run lint --filter=@native/app` + `check-types`
- **Screen integration**: Playwright/dev-browser — visual verification of UI flows
- **Evidence**: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — backend + lib foundation, ALL parallel):
├── Task 1: Schema additions (3 new tables + exerciseType on exercises)
├── Task 2: Convex workoutSessions.ts (startSession, completeSession, abandonSession, getActiveSession, getSession)
├── Task 3: Convex sessionExercises.ts (add, get, remove, reorder)
├── Task 4: Convex sessionSets.ts (addSet, logSet, updateSet, deleteSet, getSets)
├── Task 5: Zustand active-session-store + AsyncStorage install
└── Task 6: Timer hook + Convex session API refs

Wave 2 (After Wave 1 — components, ALL parallel):
├── Task 7:  SetRow component (type-aware: strength/bodyweight/cardio/timed)
├── Task 8:  ActiveExerciseCard component (header row + FlashList of SetRows)
├── Task 9:  ExercisePicker component (@expo/ui Sheet + FlashList + search)
└── Task 10: ActiveWorkoutMiniPlayer component (Portal, absolute, timer, cancel)

Wave 3 (After Wave 2 — screen + navigation wiring, sequential):
├── Task 11: Replace [id]/start.tsx with full interactive workout screen
├── Task 12: Update (main)/_layout.tsx — render ActiveWorkoutMiniPlayer via Portal
└── Task 13: Update workout/_layout.tsx — configure start screen Stack.Screen options

Wave FINAL (After ALL tasks — 4 parallel review agents):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Visual QA — full workout flow (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2/3/4 → Task 5/6 → Task 7/8/9/10 → Task 11 → Task 12 → Task 13 → FINAL
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 1)
```

### Dependency Matrix

- **T1**: None → blocks T2, T3, T4
- **T2**: T1 → blocks T11
- **T3**: T1 → blocks T11
- **T4**: T1 → blocks T8, T11
- **T5**: None → blocks T10, T11
- **T6**: T5 → blocks T9, T11
- **T7**: T4, T6 → blocks T8
- **T8**: T7 → blocks T11
- **T9**: T3, T6 → blocks T11
- **T10**: T2, T5, T6 → blocks T12
- **T11**: T2, T3, T4, T5, T6, T7, T8, T9 → blocks F1-F4
- **T12**: T10, T11 → blocks F1-F4
- **T13**: T11 → blocks F1-F4

### Agent Dispatch Summary

- **Wave 1**: T1-T4 → `unspecified-high`, T5-T6 → `quick`
- **Wave 2**: T7-T8 → `visual-engineering`, T9-T10 → `visual-engineering`
- **Wave 3**: T11 → `unspecified-high`, T12-T13 → `quick`
- **Wave FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Schema additions — workoutSessions, sessionExercises, sessionSets tables + exerciseType on exercises

  **What to do**:
  - Open `packages/backend/convex/schema.ts`
  - Add `workoutSessions` table:
    ```typescript
    workoutSessions: defineTable({
      userId: v.string(),
      name: v.string(),             // workout name snapshot (denormalized for display)
      status: v.union(v.literal('active'), v.literal('completed'), v.literal('abandoned')),
      startedAt: v.number(),        // Date.now() — timer source of truth
      completedAt: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      workoutTemplateId: v.optional(v.id('workouts')), // optional ref to saved workout
    })
      .index('by_userId', ['userId'])
      .index('by_user_status', ['userId', 'status'])   // fast active session lookup
      .index('by_user_started', ['userId', 'startedAt']),
    ```
  - Add `sessionExercises` table:
    ```typescript
    sessionExercises: defineTable({
      sessionId: v.id('workoutSessions'),
      exerciseId: v.id('exercises'),
      order: v.number(),
      notes: v.optional(v.string()),
    })
      .index('by_session', ['sessionId'])
      .index('by_session_order', ['sessionId', 'order']),
    ```
  - Add `sessionSets` table (named `sessionSets` to avoid collision with `workoutExercises.sets` field):
    ```typescript
    sessionSets: defineTable({
      sessionExerciseId: v.id('sessionExercises'),
      sessionId: v.id('workoutSessions'),   // denormalized for direct session-level queries
      setNumber: v.number(),
      type: v.union(v.literal('normal'), v.literal('warmup'), v.literal('dropset'), v.literal('failure')),
      // flexible fields — populated based on exerciseType
      reps: v.optional(v.number()),
      weightKg: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      distanceMeters: v.optional(v.number()),
      isCompleted: v.boolean(),
      completedAt: v.optional(v.number()),
    })
      .index('by_session_exercise', ['sessionExerciseId'])
      .index('by_session', ['sessionId']),
    ```
  - Update `exercises` table — add `exerciseType` as `v.optional()` for backward compat with existing rows, and `isCustom`/`createdBy` for user customs:
    ```typescript
    // Add to existing exercises table definition:
    exerciseType: v.optional(v.union(
      v.literal('strength'),   // weight + reps
      v.literal('bodyweight'), // reps only
      v.literal('cardio'),     // distance + duration
      v.literal('timed'),      // duration only
    )),
    isCustom: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
    ```
  - Run `npx convex dev` (or let it auto-run if already watching) to regenerate `_generated/` types

  **Must NOT do**:
  - Do NOT modify existing `workoutExercises` table
  - Do NOT edit `_generated/` files directly
  - Do NOT name table `sets` — must be `sessionSets`
  - Do NOT use non-optional fields on `exerciseType`/`isCustom`/`createdBy` — existing exercise rows lack them

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Schema design requires understanding the full existing schema, dependencies, and Convex-specific patterns
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for schema-only work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6) — but T2/T3/T4 depend on T1
  - **Blocks**: Tasks 2, 3, 4 (need generated types)
  - **Blocked By**: None (start immediately)

  **References**:

  **Pattern References**:
  - `packages/backend/convex/schema.ts:1-82` — full existing schema, all table definitions and index patterns
  - `packages/backend/convex/schema.ts:56-73` — `workouts` + `workoutExercises` pattern to follow

  **External References**:
  - Convex schema docs: `v.optional()` for backward-compat fields, `.index()` chaining

  **WHY Each Reference Matters**:
  - The full schema shows naming conventions (camelCase tables, snake_case only for `user_preferences`) and index patterns to match exactly

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Schema compiles without errors
    Tool: Bash
    Preconditions: In packages/backend directory, convex dev is running
    Steps:
      1. Run: pnpm turbo run check-types --filter=@repo/backend
      2. Assert exit code is 0
      3. Run: ls packages/backend/convex/_generated/dataModel.d.ts
      4. Assert file exists and was modified after schema edit (newer mtime)
    Expected Result: 0 type errors, _generated/ updated
    Failure Indicators: Any TypeScript error mentioning workoutSessions/sessionExercises/sessionSets
    Evidence: .sisyphus/evidence/task-1-schema-compile.txt

  Scenario: New tables visible in Convex dashboard
    Tool: Bash (convex CLI)
    Preconditions: Schema deployed via convex dev
    Steps:
      1. Run: npx convex data workoutSessions --limit 1
      2. Assert command succeeds (table exists, even if empty)
      3. Run: npx convex data sessionExercises --limit 1
      4. Assert command succeeds
      5. Run: npx convex data sessionSets --limit 1
      6. Assert command succeeds
    Expected Result: All 3 tables exist and are queryable
    Failure Indicators: "Table not found" or "Unknown table" error from convex CLI
    Evidence: .sisyphus/evidence/task-1-tables-exist.txt
  ```

  **Commit**: YES (commit 1–4 grouped after T4)

---

- [x] 2. Convex workoutSessions.ts — session lifecycle mutations and queries

  **What to do**:
  - Create `packages/backend/convex/workoutSessions.ts`
  - Implement `startSession` mutation:
    - Validate `args`: `workoutTemplateId: v.optional(v.id('workouts'))`, `name: v.string()`
    - Get `userId` via `ctx.auth.getUserIdentity()` → `identity.subject` (follow `workouts.ts:11-15` pattern)
    - Check for existing active session using `by_user_status` index → if found, throw `ConvexError('ACTIVE_SESSION_EXISTS')`
    - Insert into `workoutSessions` with `status: 'active'`, `startedAt: Date.now()`
    - Return the new `sessionId`
  - Implement `completeSession` mutation:
    - Args: `{ sessionId: v.id('workoutSessions') }`
    - Auth check + ownership check (session.userId === identity.subject)
    - Patch: `status: 'completed'`, `completedAt: Date.now()`, `durationSeconds: Math.floor((Date.now() - session.startedAt) / 1000)`
  - Implement `abandonSession` mutation:
    - Args: `{ sessionId: v.id('workoutSessions') }`
    - Auth check + ownership check
    - Patch: `status: 'abandoned'`, `completedAt: Date.now()`
  - Implement `getActiveSession` query:
    - No args (uses auth to get userId)
    - Query `by_user_status` index: `eq('userId', userId).eq('status', 'active')` → `.first()`
    - Return session doc or `null`
  - Implement `getSession` query:
    - Args: `{ sessionId: v.id('workoutSessions') }`
    - Auth check + ownership check
    - Return session doc

  **Must NOT do**:
  - Do NOT allow multiple active sessions per user — enforce in `startSession`
  - Do NOT skip auth check on any mutation
  - Do NOT delete session data on abandon — patch status only (preserve for potential history)
  - Do NOT build history/list queries — scope to active session only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Convex-specific patterns, auth integration, error handling conventions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T1 generated types are available)
  - **Parallel Group**: Wave 1b (with Tasks 3, 4 — all after T1)
  - **Blocks**: Task 10 (mini-player uses getActiveSession), Task 11 (screen uses all session mutations)
  - **Blocked By**: Task 1 (needs generated types for `v.id('workoutSessions')`)

  **References**:

  **Pattern References**:
  - `packages/backend/convex/workouts.ts` — full file; follow auth check pattern (`getUserIdentity` → `identity.subject`), `ConvexError` for client errors, ownership verification before mutations
  - `packages/backend/convex/schema.ts:56-60` — `workouts` table (userId as string, not v.id)

  **WHY Each Reference Matters**:
  - `workouts.ts` auth pattern is the established convention — must match exactly or type errors will appear in the Convex adapter

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: startSession creates active session in DB
    Tool: Bash (convex CLI)
    Preconditions: User authenticated, no active session exists
    Steps:
      1. Run: npx convex run workoutSessions:startSession '{"name": "Push Day"}'
      2. Assert response contains a valid _id string
      3. Run: npx convex run workoutSessions:getActiveSession '{}'
      4. Assert response.status === "active"
      5. Assert response.name === "Push Day"
      6. Assert response.startedAt is a number within last 5 seconds
    Expected Result: Session created and retrievable via getActiveSession
    Failure Indicators: ConvexError, null response, missing fields
    Evidence: .sisyphus/evidence/task-2-start-session.txt

  Scenario: startSession blocks concurrent active sessions
    Tool: Bash (convex CLI)
    Preconditions: Active session already exists (from previous scenario)
    Steps:
      1. Run: npx convex run workoutSessions:startSession '{"name": "Leg Day"}'
      2. Assert response contains error with code "ACTIVE_SESSION_EXISTS"
    Expected Result: ConvexError thrown, second session NOT created
    Failure Indicators: Second session created, no error thrown
    Evidence: .sisyphus/evidence/task-2-block-concurrent.txt

  Scenario: completeSession marks session as completed
    Tool: Bash (convex CLI)
    Preconditions: Active session exists, sessionId known
    Steps:
      1. Run: npx convex run workoutSessions:completeSession '{"sessionId": "<id>"}'
      2. Run: npx convex run workoutSessions:getSession '{"sessionId": "<id>"}'
      3. Assert response.status === "completed"
      4. Assert response.completedAt is a number
      5. Assert response.durationSeconds > 0
    Expected Result: Session marked complete with timestamp and duration
    Evidence: .sisyphus/evidence/task-2-complete-session.txt
  ```

  **Commit**: YES (grouped with T1, T3, T4 after all backend tasks done)

---

- [x] 3. Convex sessionExercises.ts — add, get, remove, reorder exercises in session

  **What to do**:
  - Create `packages/backend/convex/sessionExercises.ts`
  - Implement `addExerciseToSession` mutation:
    - Args: `{ sessionId: v.id('workoutSessions'), exerciseId: v.id('exercises') }`
    - Auth check + verify session ownership + verify session status is `'active'`
    - Count existing exercises (query `by_session` index) → set `order` to count + 1
    - Insert into `sessionExercises`, return new doc `_id`
  - Implement `getSessionExercises` query:
    - Args: `{ sessionId: v.id('workoutSessions') }`
    - Query `by_session_order` index
    - For each session exercise, fetch joined `exercises` doc (via `ctx.db.get(se.exerciseId)`)
    - Return array of `{ ...sessionExercise, exercise: exerciseDoc }`
  - Implement `removeExerciseFromSession` mutation:
    - Args: `{ sessionExerciseId: v.id('sessionExercises') }`
    - Auth check + verify ownership through session → patch or delete the row
    - Use `ctx.db.delete(sessionExerciseId)`
  - Implement `reorderExercises` mutation:
    - Args: `{ sessionId: v.id('workoutSessions'), orderedIds: v.array(v.id('sessionExercises')) }`
    - Auth + ownership check
    - Iterate `orderedIds`, patch each doc's `order` field to its array index
    - Note: This is a "nice to have" for completeness — but no drag-and-drop UI is in scope

  **Must NOT do**:
  - Do NOT allow adding exercises to a `completed` or `abandoned` session
  - Do NOT build drag-and-drop reorder UI (Convex function is fine, UI is out of scope)
  - Do NOT return exercises without their joined exercise catalog data

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Convex patterns, join queries, auth/ownership chain

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T4 after T1)
  - **Parallel Group**: Wave 1b
  - **Blocks**: Task 9 (ExercisePicker uses addExerciseToSession), Task 11 (screen uses getSessionExercises)
  - **Blocked By**: Task 1

  **References**:
  - `packages/backend/convex/workouts.ts` — auth pattern, ConvexError usage
  - `packages/backend/convex/schema.ts:62-73` — `workoutExercises` pattern for join table
  - `packages/backend/convex/workoutExercises.ts` (if exists) — join query pattern with `ctx.db.get`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: addExerciseToSession adds exercise with correct order
    Tool: Bash (convex CLI)
    Preconditions: Active session exists (sessionId known), exercise exists in catalog (exerciseId known)
    Steps:
      1. Run: npx convex run sessionExercises:addExerciseToSession '{"sessionId": "<sid>", "exerciseId": "<eid>"}'
      2. Assert response is a valid _id string
      3. Run: npx convex run sessionExercises:getSessionExercises '{"sessionId": "<sid>"}'
      4. Assert array length is 1
      5. Assert first element has exercise.name populated (join worked)
      6. Assert first element.order === 1
    Expected Result: Exercise added with joined catalog data and correct order
    Failure Indicators: Empty array, missing exercise.name, wrong order value
    Evidence: .sisyphus/evidence/task-3-add-exercise.txt

  Scenario: addExerciseToSession rejects completed session
    Tool: Bash (convex CLI)
    Preconditions: Completed session exists (status: 'completed')
    Steps:
      1. Run: npx convex run sessionExercises:addExerciseToSession '{"sessionId": "<completed_sid>", "exerciseId": "<eid>"}'
      2. Assert error is thrown (ConvexError)
    Expected Result: Error thrown, no exercise added
    Evidence: .sisyphus/evidence/task-3-reject-completed.txt
  ```

  **Commit**: YES (grouped with backend tasks)

---

- [x] 4. Convex sessionSets.ts — set logging mutations and queries

  **What to do**:
  - Create `packages/backend/convex/sessionSets.ts`
  - Implement `addSet` mutation (creates an empty/pending set row):
    - Args: `{ sessionExerciseId: v.id('sessionExercises'), sessionId: v.id('workoutSessions'), setNumber: v.number(), type: v.optional(v.string()) }`
    - Auth check + verify session is active
    - Insert with `isCompleted: false`, no metric fields yet
    - Return new `_id`
  - Implement `logSet` mutation (marks a set as completed with metrics):
    - Args: `{ setId: v.id('sessionSets'), reps: v.optional(v.number()), weightKg: v.optional(v.number()), durationSeconds: v.optional(v.number()), distanceMeters: v.optional(v.number()) }`
    - Auth check + ownership
    - Patch: `isCompleted: true`, `completedAt: Date.now()`, + provided metric fields
  - Implement `updateSet` mutation:
    - Args: same metric fields as `logSet` + `setId`
    - Allows editing an already-logged set
    - Auth + ownership check
  - Implement `deleteSet` mutation:
    - Args: `{ setId: v.id('sessionSets') }`
    - Auth + ownership check
    - `ctx.db.delete(setId)`
  - Implement `getSetsForSession` query:
    - Args: `{ sessionId: v.id('workoutSessions') }`
    - Query `by_session` index → return all sets for the session
    - Used by screen to populate set rows on load/resume

  **Must NOT do**:
  - Do NOT enforce which metric fields are required server-side (exercise type determines this on client)
  - Do NOT allow logging sets on abandoned/completed sessions
  - Do NOT build "personal record" comparison logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Convex auth patterns, flexible schema, data integrity constraints

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T3 after T1)
  - **Parallel Group**: Wave 1b
  - **Blocks**: Tasks 7, 8, 11 (set rows need logSet/addSet/getSets)
  - **Blocked By**: Task 1

  **References**:
  - `packages/backend/convex/workouts.ts` — auth pattern
  - `packages/backend/convex/schema.ts:62-73` — field optionality pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full set lifecycle — add, log, update
    Tool: Bash (convex CLI)
    Preconditions: Active session + sessionExercise exist (IDs known)
    Steps:
      1. Run: npx convex run sessionSets:addSet '{"sessionExerciseId":"<seid>","sessionId":"<sid>","setNumber":1}'
      2. Assert returned _id is valid (save as setId)
      3. Run: npx convex run sessionSets:logSet '{"setId":"<setId>","reps":10,"weightKg":80}'
      4. Run: npx convex run sessionSets:getSetsForSession '{"sessionId":"<sid>"}'
      5. Assert array contains the set with isCompleted: true, reps: 10, weightKg: 80
      6. Run: npx convex run sessionSets:updateSet '{"setId":"<setId>","reps":12,"weightKg":82.5}'
      7. Re-query getSetsForSession → assert reps: 12, weightKg: 82.5
    Expected Result: Set created, logged, and updated correctly
    Evidence: .sisyphus/evidence/task-4-set-lifecycle.txt

  Scenario: deleteSet removes the set
    Tool: Bash (convex CLI)
    Preconditions: A completed set exists (setId known)
    Steps:
      1. Run: npx convex run sessionSets:deleteSet '{"setId":"<setId>"}'
      2. Run: npx convex run sessionSets:getSetsForSession '{"sessionId":"<sid>"}'
      3. Assert the deleted setId is no longer in the array
    Expected Result: Set removed from DB
    Evidence: .sisyphus/evidence/task-4-delete-set.txt
  ```

  **Commit**: YES (grouped with backend tasks)

---

- [x] 5. Zustand active session store + AsyncStorage install

  **What to do**:
  - Install AsyncStorage: `expo install @react-native-async-storage/async-storage` (run from `apps/native/`)
  - Create `apps/native/lib/workout/active-session-store.ts`
  - Define interface (follow `lib/workout/store.ts` pattern exactly):
    ```typescript
    interface ActiveSessionState {
      // Persisted (crash recovery)
      activeSessionId: string | null;
      sessionStartTimestamp: number | null;  // Date.now() when session started
      sessionName: string;

      // Non-persisted (UI state — reset on mount)
      currentExerciseIndex: number;
    }

    interface ActiveSessionActions {
      startSession: (sessionId: string, name: string, startTimestamp: number) => void;
      endSession: () => void;
      setCurrentExerciseIndex: (index: number) => void;
    }

    type ActiveSessionStore = ActiveSessionState & ActiveSessionActions;
    ```
  - Implement with `persist` middleware (only persist crash-recovery fields):
    ```typescript
    import { create } from 'zustand';
    import { persist, createJSONStorage } from 'zustand/middleware';
    import AsyncStorage from '@react-native-async-storage/async-storage';

    export const useActiveSessionStore = create<ActiveSessionStore>()(
      persist(
        (set) => ({
          activeSessionId: null,
          sessionStartTimestamp: null,
          sessionName: '',
          currentExerciseIndex: 0,

          startSession: (sessionId, name, startTimestamp) => set({
            activeSessionId: sessionId,
            sessionStartTimestamp: startTimestamp,
            sessionName: name,
            currentExerciseIndex: 0,
          }),

          endSession: () => set({
            activeSessionId: null,
            sessionStartTimestamp: null,
            sessionName: '',
            currentExerciseIndex: 0,
          }),

          setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),
        }),
        {
          name: 'benchmrk-active-workout',
          storage: createJSONStorage(() => AsyncStorage),
          partialize: (state) => ({
            activeSessionId: state.activeSessionId,
            sessionStartTimestamp: state.sessionStartTimestamp,
            sessionName: state.sessionName,
          }),
        }
      )
    );
    ```
  - Export from `apps/native/lib/workout/index.ts` barrel
  - Add import to `apps/native/lib/index.ts` if workout barrel is re-exported there

  **Must NOT do**:
  - Do NOT persist `currentExerciseIndex` or other UI state (crash recovery only needs sessionId + startTimestamp)
  - Do NOT use `useState` for active session data in any component — always Zustand
  - Do NOT import AsyncStorage from deprecated `react-native-async-storage/async-storage` (use `@react-native-async-storage/async-storage`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Clear interface, follows existing Zustand pattern exactly, one file + one install command

  **Parallelization**:
  - **Can Run In Parallel**: YES (no dependency on T1)
  - **Parallel Group**: Wave 1 (with T1-T4, T6)
  - **Blocks**: Tasks 10 (mini-player reads store), 11 (screen reads/writes store)
  - **Blocked By**: None

  **References**:
  - `apps/native/lib/workout/store.ts` — full file; exact Zustand interface + `create<Store>()` pattern to follow
  - `apps/native/lib/workout/index.ts` — barrel to update
  - `apps/native/lib/index.ts` — root barrel

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Store initializes with null session
    Tool: Bash
    Steps:
      1. Run: pnpm turbo run check-types --filter=@native/app
      2. Assert exit code 0 (store types are correct)
      3. Grep for useActiveSessionStore in lib/workout/index.ts
      4. Assert it is exported (barrel includes it)
    Expected Result: 0 type errors, store exported from barrel
    Failure Indicators: TypeScript error referencing active-session-store.ts
    Evidence: .sisyphus/evidence/task-5-store-types.txt

  Scenario: AsyncStorage installed
    Tool: Bash
    Steps:
      1. Run: cat apps/native/package.json | grep async-storage
      2. Assert "@react-native-async-storage/async-storage" appears in dependencies
    Expected Result: Dependency listed in package.json
    Evidence: .sisyphus/evidence/task-5-asyncstorage-installed.txt
  ```

  **Commit**: YES (commit 5)

---

- [x] 6. Timer hook + typed Convex session API refs

  **What to do**:
  - **Part A: Timer hook** — Create `apps/native/lib/workout/use-workout-timer.ts`:
    ```typescript
    import { useEffect, useRef, useState, useCallback } from 'react';
    import { AppState, AppStateStatus } from 'react-native';

    export function useWorkoutTimer(startTimestamp: number | null) {
      const [elapsedSeconds, setElapsedSeconds] = useState(0);
      const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

      const tick = useCallback(() => {
        if (startTimestamp === null) return;
        setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
      }, [startTimestamp]);

      useEffect(() => {
        if (startTimestamp === null) {
          setElapsedSeconds(0);
          return;
        }
        tick(); // immediate sync
        intervalRef.current = setInterval(tick, 1000);
        return () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      }, [startTimestamp, tick]);

      useEffect(() => {
        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
          if (next === 'background' || next === 'inactive') {
            if (intervalRef.current) clearInterval(intervalRef.current);
          } else if (next === 'active' && startTimestamp !== null) {
            tick();
            intervalRef.current = setInterval(tick, 1000);
          }
        });
        return () => sub.remove();
      }, [startTimestamp, tick]);

      // Format mm:ss
      const formatted = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

      return { elapsedSeconds, formatted };
    }
    ```
  - Export from `apps/native/lib/workout/index.ts`
  - **Part B: Session API refs** — Create `apps/native/lib/convex/session-api.ts`:
    - Follow `lib/convex/workout-api.ts` exactly — use `makeFunctionReference()` with typed `QueryRef`/`MutationRef`
    - Export typed refs for all new Convex functions:
      ```typescript
      export const workoutSessionsApi = {
        startSession: makeFunctionReference<'mutation', ...>('workoutSessions:startSession'),
        completeSession: makeFunctionReference<'mutation', ...>('workoutSessions:completeSession'),
        abandonSession: makeFunctionReference<'mutation', ...>('workoutSessions:abandonSession'),
        getActiveSession: makeFunctionReference<'query', ...>('workoutSessions:getActiveSession'),
        getSession: makeFunctionReference<'query', ...>('workoutSessions:getSession'),
      };
      export const sessionExercisesApi = { ... };
      export const sessionSetsApi = { ... };
      ```
    - Export from `apps/native/lib/index.ts`

  **Must NOT do**:
  - Do NOT use `setInterval` as the sole source of elapsed time — always compute from `Date.now() - startTimestamp`
  - Do NOT use `useState` for intervalRef or the last-backgrounded timestamp
  - Do NOT hardcode function names as strings outside of `session-api.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Clear spec, follows established patterns, two focused files

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1-T5)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 9 (picker uses sessionExercisesApi), 10 (mini-player uses workoutSessionsApi), 11 (screen uses all)
  - **Blocked By**: Task 5 (needs active-session-store to import startTimestamp)

  **References**:
  - `apps/native/lib/convex/workout-api.ts` — full file; exact `makeFunctionReference` pattern to replicate
  - `apps/native/lib/workout/index.ts` — barrel to update

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Timer formatted output is correct
    Tool: Bash
    Steps:
      1. Run: pnpm turbo run check-types --filter=@native/app
      2. Assert 0 errors (hook types are correct)
      3. Grep for useWorkoutTimer in lib/workout/index.ts → assert exported
      4. Grep for workoutSessionsApi in lib/index.ts → assert exported
    Expected Result: Both exports present, 0 type errors
    Evidence: .sisyphus/evidence/task-6-timer-and-api-types.txt
  ```

  **Commit**: YES (commit 5, grouped with T5)

---

- [ ] 7. SetRow component — type-aware set row with metrics input

  **What to do**:
  - Create `apps/native/components/workout/SetRow.tsx`
  - Props interface:
    ```typescript
    interface SetRowProps {
      setNumber: number;
      exerciseType: 'strength' | 'bodyweight' | 'cardio' | 'timed' | undefined;
      isCompleted: boolean;
      reps?: number;
      weightKg?: number;
      durationSeconds?: number;
      distanceMeters?: number;
      weightUnit: 'kg' | 'lbs';   // from user_preferences
      onLog: (metrics: SetMetrics) => void;    // calls logSet mutation
      onDelete: () => void;                     // calls deleteSet mutation
    }
    ```
  - Layout: horizontal row, `justify-between`, `items-center`:
    - Left: Set number badge (`#1`, `#2`...) in `text-white/50 text-sm w-8`
    - Center: Input fields based on `exerciseType`:
      - `'strength'`: `[kg/lbs input] × [reps input]` — two `Input` components with `keyboardType="numeric"`
      - `'bodyweight'`: `[reps input]` — single `Input`
      - `'cardio'`: `[km input] [min input]` — two `Input` components
      - `'timed'`: `[sec input]` — single `Input`
      - `undefined` defaults to strength inputs
    - Right: Complete/checkmark button — `bg-green-1 rounded-lg px-3 py-2` when incomplete, `bg-green-1/20` when complete
  - When complete button tapped: fire haptic (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`), call `onLog`
  - Completed rows: dim to `opacity-60`, show a checkmark (SF Symbol `checkmark` or `✓`)
  - Use `Input` component from `@/components/ui/input` for metric fields
  - All text via `Text` component from `@/components/ui/text`
  - NativeWind `className` only — NO `StyleSheet.create`

  **Must NOT do**:
  - Do NOT build rest timer countdown in this component
  - Do NOT add drag handles (no reordering in scope)
  - Do NOT use `StyleSheet.create`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with conditional rendering based on exercise type, metric inputs, haptic feedback
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Native UI patterns, input field design, conditional rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8, T9, T10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8 (ActiveExerciseCard embeds SetRow)
  - **Blocked By**: Tasks 4 (logSet/deleteSet function signatures), 6 (session API refs)

  **References**:
  - `apps/native/components/ui/input.tsx` — Input component to use for metrics
  - `apps/native/components/ui/text.tsx` — Text CVA variants
  - `apps/native/components/ui/button.tsx` — Button component (icon variant for checkmark)
  - `apps/native/components/workout/ExerciseRow.tsx:26-40` — card styling pattern (`rounded-2xl border border-white/10 bg-black-3`)
  - `apps/native/components/ui/pin-input.tsx:1,97` — `expo-haptics` usage pattern: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: SetRow renders strength inputs
    Tool: Bash (type check + lint)
    Steps:
      1. Run: pnpm turbo run check-types --filter=@native/app
      2. Assert 0 errors
      3. Run: pnpm turbo run lint --filter=@native/app
      4. Assert 0 errors/warnings in SetRow.tsx
    Expected Result: Clean types and lint
    Evidence: .sisyphus/evidence/task-7-setrow-types.txt

  Scenario: SetRow visual verification (if emulator available)
    Tool: dev-browser (Playwright/Expo Go)
    Steps:
      1. Navigate to active workout screen with a strength exercise
      2. Assert set row shows two numeric inputs side by side (weight × reps)
      3. Assert complete button is visible (green bg)
      4. Enter weight "80" in first input, reps "10" in second
      5. Tap complete button
      6. Assert row dims to opacity-60 and shows checkmark
    Expected Result: Correct layout per exerciseType, completion state visible
    Evidence: .sisyphus/evidence/task-7-setrow-visual.png
  ```

  **Commit**: YES (commit 7, with T8)

---

- [ ] 8. ActiveExerciseCard component — exercise card with header row and set rows

  **What to do**:
  - Create `apps/native/components/workout/ActiveExerciseCard.tsx`
  - Props:
    ```typescript
    interface ActiveExerciseCardProps {
      sessionExerciseId: string;
      exercise: { _id: string; name: string; imageUrl?: string; exerciseType?: ExerciseType; };
      sets: SessionSet[];           // from getSetsForSession
      weightUnit: 'kg' | 'lbs';
      onAddSet: () => void;         // calls addSet mutation + optimistic local array append
      onLogSet: (setId: string, metrics: SetMetrics) => void;
      onDeleteSet: (setId: string) => void;
      onRemoveExercise: () => void; // from 3-dot menu
    }
    ```
  - **Header row** — `flex-row justify-between items-center`:
    - Left: `Avatar` (`AvatarImage` for `imageUrl`, `AvatarFallback` with first letter) → exercise name `Text` variant `large font-semibold text-white`
    - Right: `[+ Add Set button] [⋯ menu button]`
    - Add Set: `Button` variant `ghost` with `text-green-1` — calls `onAddSet`
    - 3-dot menu: `Button` variant `ghost` `icon` size — on press shows `ActionSheetIOS.showActionSheetWithOptions` (iOS) with options: "Remove Exercise", "Cancel"; calls `onRemoveExercise`
  - **Set rows**: `FlashList` (from `@shopify/flash-list`) of `SetRow` components, `estimatedItemSize={52}`
  - Card container: `rounded-2xl border border-white/10 bg-black-3 px-4 py-4 mb-3`
  - Import `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
  - NativeWind only

  **Must NOT do**:
  - Do NOT use `FlatList` — use `@shopify/flash-list` for performance
  - Do NOT use `StyleSheet.create`
  - Do NOT build drag-and-drop reorder handles

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex card layout with header row, nested list of set rows, ActionSheet menu
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9, T10)
  - **Parallel Group**: Wave 2 (starts after T7 is done)
  - **Blocks**: Task 11 (screen embeds ActiveExerciseCard)
  - **Blocked By**: Task 7 (SetRow must exist first)

  **References**:
  - `apps/native/components/workout/ExerciseRow.tsx` — Avatar usage, card styling, layout conventions
  - `apps/native/components/ui/avatar.tsx` — AvatarImage + AvatarFallback pattern
  - `apps/native/components/ui/button.tsx` — ghost/icon variants
  - `apps/native/components/workout/SetRow.tsx` — (just created in T7)
  - `@shopify/flash-list` docs — `FlashList`, `estimatedItemSize`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: ActiveExerciseCard renders header correctly
    Tool: Bash (type check)
    Steps:
      1. Run: pnpm turbo run check-types --filter=@native/app
      2. Assert 0 errors in ActiveExerciseCard.tsx
      3. Run: pnpm turbo run lint --filter=@native/app
      4. Assert 0 errors/warnings
    Expected Result: Clean compile
    Evidence: .sisyphus/evidence/task-8-card-types.txt

  Scenario: 3-dot menu shows Remove Exercise option
    Tool: dev-browser
    Steps:
      1. Navigate to active workout screen with an exercise added
      2. Assert exercise card is visible with name in header
      3. Tap the ⋯ button on the exercise card
      4. Assert ActionSheet appears with "Remove Exercise" and "Cancel" options
      5. Tap "Cancel" → assert ActionSheet dismisses, exercise card still visible
      6. Tap ⋯ again → tap "Remove Exercise" → assert exercise card disappears
    Expected Result: ActionSheet works, remove exercise removes the card
    Evidence: .sisyphus/evidence/task-8-action-sheet.png
  ```

  **Commit**: YES (commit 7, with T7)

---

- [ ] 9. ExercisePicker component — @expo/ui Sheet with search and FlashList

  **What to do**:
  - Create `apps/native/components/workout/ExercisePicker.tsx`
  - Props:
    ```typescript
    interface ExercisePickerProps {
      sessionId: string;
      isOpen: boolean;
      onClose: () => void;
      onExerciseAdded: (sessionExerciseId: string) => void;  // callback after addExerciseToSession
    }
    ```
  - **iOS**: Use `@expo/ui/swift-ui` BottomSheet with installed API:
    ```typescript
    import { BottomSheet } from '@expo/ui/swift-ui';
    // ...
    <BottomSheet
      isOpened={isOpen}
      onIsOpenedChange={(open) => { if (!open) onClose(); }}
      presentationDetents={['medium', 0.9]}
      presentationDragIndicator="visible"
    >
      {children}
    </BottomSheet>
    ```
  - **Android**: Platform-guarded fallback — use React Native `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`
  - Inside the sheet:
    - Search bar: `TextInput` with magnifyingglass SF symbol, `bg-black-3 rounded-xl text-white` styling
    - Category filter: horizontal `ScrollView` with pill buttons (`Chest`, `Back`, `Legs`, `Core`, etc.)
    - Exercise list: `FlashList` from `@shopify/flash-list`, `estimatedItemSize={72}`
    - Each row: `Avatar` + exercise name + category tag + `Pressable` to select
    - On select: call `addExerciseToSession` mutation (via `sessionExercisesApi`), on success call `onExerciseAdded(newId)` + `onClose()`
  - Use `useQuery(sessionExercisesApi.getSessionExercises, ...)` ... wait, this is the exercise CATALOG picker, not session exercises. Use `listExercises` from existing `workoutsApi` or `exercisesApi`
  - Filter exercises by search query and selected category on the client side

  **Must NOT do**:
  - Do NOT build custom exercise creation form inside this picker
  - Do NOT use `@gorhom/bottom-sheet` (Reanimated 4 compatibility risk, not installed)
  - Do NOT use the latest `@expo/ui` source API (`isPresented`) — use installed v0.2.0-beta.9 API (`isOpened`)
  - Do NOT use `FlatList` — use `FlashList`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Native bottom sheet, search UX, category filter pills, exercise list
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8, T10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11 (screen embeds ExercisePicker)
  - **Blocked By**: Tasks 3 (addExerciseToSession), 6 (sessionExercisesApi ref)

  **References**:
  - `apps/native/components/workout/ExerciseRow.tsx` — exercise list row pattern (Avatar + name + style)
  - `apps/native/lib/convex/workout-api.ts` — `workoutsApi` for listExercises ref
  - `@expo/ui/swift-ui` BottomSheet — import path and `isOpened`/`onIsOpenedChange` API
  - `apps/native/app/(main)/workout/create/index.tsx` — existing exercise selection UI to draw from

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: ExercisePicker opens and shows exercise list
    Tool: dev-browser
    Steps:
      1. Navigate to active workout screen
      2. Tap "Add Exercise" button in header
      3. Assert bottom sheet slides up from bottom
      4. Assert exercise list is visible with at least 5 exercises
      5. Assert search bar is visible at top of sheet
    Expected Result: Sheet opens, exercises listed
    Evidence: .sisyphus/evidence/task-9-picker-open.png

  Scenario: Search filters exercise list
    Tool: dev-browser
    Steps:
      1. Open exercise picker
      2. Tap search bar and type "pull"
      3. Assert list narrows to show only exercises containing "pull" in name
      4. Clear search → assert full list returns
    Expected Result: Real-time search filtering works
    Evidence: .sisyphus/evidence/task-9-picker-search.png

  Scenario: Selecting exercise adds it to workout and closes sheet
    Tool: dev-browser
    Steps:
      1. Open exercise picker
      2. Tap first exercise in list (e.g. "Bench Press")
      3. Assert sheet dismisses
      4. Assert new exercise card appears in active workout screen
    Expected Result: Exercise added to session, card visible
    Evidence: .sisyphus/evidence/task-9-picker-add.png
  ```

  **Commit**: YES (commit 8)

---

- [ ] 10. ActiveWorkoutMiniPlayer component — floating card above tab bar via Portal

  **What to do**:
  - Create `apps/native/components/workout/ActiveWorkoutMiniPlayer.tsx`
  - Uses `Portal` from `@rn-primitives/portal` (already installed) to render above all tab content
  - Reads from Zustand store (selector subscriptions — no re-render on unrelated state changes):
    ```typescript
    const activeSessionId = useActiveSessionStore((s) => s.activeSessionId);
    const sessionStartTimestamp = useActiveSessionStore((s) => s.sessionStartTimestamp);
    const sessionName = useActiveSessionStore((s) => s.sessionName);
    const endSession = useActiveSessionStore((s) => s.endSession);
    ```
  - Uses `useWorkoutTimer(sessionStartTimestamp)` for live elapsed time display
  - Uses `useSafeAreaInsets()` for correct bottom offset above tab bar
  - Layout (only renders when `activeSessionId !== null`):
    ```typescript
    <Portal name="workout-mini-player">
      {activeSessionId && (
        <Pressable
          onPress={() => router.push(`/workout/${workoutId}/start`)}  // tap to resume
          style={{
            position: 'absolute',
            bottom: tabBarHeight + insets.bottom + 8,
            left: 16, right: 16,
          }}
        >
          <View className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-black-2 px-4 py-3">
            <View className="flex-row items-center gap-3">
              <View className="h-2 w-2 rounded-full bg-green-1" />  {/* live indicator dot */}
              <Text className="font-semibold text-white text-sm">{sessionName}</Text>
            </View>
            <Text className="font-mono text-green-1 text-sm">{formatted}</Text>  {/* live timer */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleCancel(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white/50 text-sm">✕</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </Portal>
    ```
  - `handleCancel`: Show `Alert.alert` with "Cancel workout?", "This will discard all progress" + [Cancel, Discard] buttons → on Discard: call `abandonSession` mutation → call `endSession()` (Zustand) → `router.replace('/(main)')` if currently on start screen
  - Tab bar height: use `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs` OR hardcode `49` as fallback
  - The component will be rendered in `(main)/_layout.tsx` (Task 12)

  **Must NOT do**:
  - Do NOT use `NativeTabs.BottomAccessory` (not in SDK 54)
  - Do NOT use `useState` for session data — read from Zustand store only
  - Do NOT render when `activeSessionId === null` (conditional inside Portal)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Portal rendering, absolute positioning, safe area insets, live timer display
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12 (layout integrates this component)
  - **Blocked By**: Tasks 2 (abandonSession), 5 (Zustand store), 6 (timer hook + API refs)

  **References**:
  - `apps/native/app/_layout.tsx:72` — existing `PortalHost` render (confirm name and location)
  - `@rn-primitives/portal` docs — `Portal` component with `name` prop
  - `apps/native/lib/workout/active-session-store.ts` — (T5) for store selectors
  - `apps/native/lib/workout/use-workout-timer.ts` — (T6) for `useWorkoutTimer`
  - `apps/native/theme/colors.ts` — color tokens reference

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Mini-player appears when session is active
    Tool: dev-browser
    Steps:
      1. Start an active workout session (tap Start on a workout)
      2. Tap the back/minimize button (chevron down in header)
      3. Navigate to Home tab
      4. Assert mini-player card is visible above the tab bar
      5. Assert it shows the workout name and a running timer in green
      6. Assert a ✕ button is visible on the right
    Expected Result: Mini-player floating above tab bar, timer incrementing
    Evidence: .sisyphus/evidence/task-10-miniplayer-visible.png

  Scenario: Tapping mini-player navigates back to workout
    Tool: dev-browser
    Steps:
      1. With mini-player visible (from previous scenario)
      2. Tap anywhere on the mini-player card (not the ✕)
      3. Assert navigation returns to the active workout screen
      4. Assert timer continues from where it was (no reset)
    Expected Result: Resume workout from mini-player tap
    Evidence: .sisyphus/evidence/task-10-miniplayer-tap.png

  Scenario: Cancel button shows alert and abandons session
    Tool: dev-browser
    Steps:
      1. With mini-player visible
      2. Tap the ✕ button on the mini-player
      3. Assert Alert appears: "Cancel workout?" with "Discard" and "Cancel" buttons
      4. Tap "Cancel" → assert Alert dismisses, mini-player still visible
      5. Tap ✕ again → tap "Discard"
      6. Assert mini-player disappears
      7. Run: npx convex data workoutSessions --limit 1 → assert latest session status === "abandoned"
    Expected Result: Session abandoned, mini-player gone, DB updated
    Evidence: .sisyphus/evidence/task-10-cancel-flow.png
  ```

  **Commit**: YES (commit 9)

---

- [ ] 11. Replace [id]/start.tsx — full interactive active workout screen

  **What to do**:
  - Fully replace `apps/native/app/(main)/workout/[id]/start.tsx` (75-line stub)
  - **On mount**:
    - Load params: `const { id: workoutId } = useLocalSearchParams<{ id: string }>()`
    - Check `useActiveSessionStore` — if `activeSessionId` is non-null AND already matches this workout, resume (don't create new session)
    - If no active session: call `startSession` mutation with `{ name: workout.name, workoutTemplateId: workoutId }` → store returned `sessionId` in Zustand via `startSession(id, name, Date.now())`
    - If `activeSessionId !== null` from a DIFFERENT workout: show Alert "Active workout in progress — finish or discard it first" → navigate back
  - **Custom header** (use `navigation.setOptions` in `useEffect`):
    - `headerLeft`: Pressable with SF Symbol `chevron.down` → on press: `router.replace('/(main)')` (minimizes — does NOT end session)
    - `headerTitle`: Render `useWorkoutTimer` formatted time with `font-mono text-white font-semibold text-lg`
    - `headerRight`: Two buttons — "Add" (SF Symbol `plus`) → sets `isPickerOpen(true)`; "Finish" (`Button` variant ghost, `text-green-1`) → triggers `handleComplete`
  - **Body**: `ScrollView` → `FlashList` of `ActiveExerciseCard` for each session exercise
    - Load exercises via `useQuery(sessionExercisesApi.getSessionExercises, { sessionId })`
    - Load sets via `useQuery(sessionSetsApi.getSetsForSession, { sessionId })`
    - Pass correct sets to each `ActiveExerciseCard` (filter by `sessionExerciseId`)
  - **Empty state** (no exercises yet): dashed border card "Add your first exercise →" with `text-white/40`
  - **handleComplete**: `Alert.alert` "Finish workout?" → confirm → call `completeSession` mutation → call `endSession()` (Zustand) → `router.replace('/workout')` (back to list)
  - **handleAddSet** (per exercise): call `addSet` mutation → the `useQuery` for sets will auto-update via Convex reactivity
  - Render `ExercisePicker` (T9) at bottom of screen, controlled by `isPickerOpen` state
  - `SafeAreaView` with `edges={['bottom']}` — header is handled by Stack

  **Must NOT do**:
  - Do NOT call `router.back()` on minimize — use `router.replace('/(main)')`
  - Do NOT use `StyleSheet.create`
  - Do NOT show planned sets/reps/weight from `workoutExercises` — this is a LIVE session, not a plan preview
  - Do NOT re-create the session if one already exists for this workoutId

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex orchestration — session lifecycle, Convex queries, custom header, multiple component integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — must be after all components are ready
  - **Parallel Group**: Wave 3 (sequential with T12, T13)
  - **Blocks**: Tasks F1-F4 (final review)
  - **Blocked By**: Tasks 2, 3, 4, 5, 6, 7, 8, 9 (all wave 1+2 tasks)

  **References**:
  - `apps/native/app/(main)/workout/[id]/start.tsx` — current stub to replace (read it first with lsp_find_references on useQuery calls)
  - `apps/native/app/(main)/workout/create/index.tsx:31-43` — `navigation.setOptions` pattern for custom header buttons
  - `apps/native/components/workout/ActiveExerciseCard.tsx` — (T8)
  - `apps/native/components/workout/ExercisePicker.tsx` — (T9)
  - `apps/native/lib/workout/active-session-store.ts` — (T5) store selectors
  - `apps/native/lib/workout/use-workout-timer.ts` — (T6)
  - `apps/native/lib/convex/session-api.ts` — (T6) all API refs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Starting a workout creates a session in DB
    Tool: dev-browser + Bash
    Steps:
      1. Navigate to Workout tab
      2. Tap "Start" on an existing workout
      3. Assert active workout screen loads with timer running from 0:00
      4. Assert header shows: back chevron (left), timer (center), "+" and "Finish" (right)
      5. Run: npx convex run workoutSessions:getActiveSession '{}'
      6. Assert response.status === "active"
    Expected Result: Screen loads, DB has active session
    Evidence: .sisyphus/evidence/task-11-start-session.png

  Scenario: Minimize navigates away without ending session
    Tool: dev-browser + Bash
    Steps:
      1. With active workout screen open (timer at ~10s)
      2. Tap the chevron-down back button
      3. Assert navigation goes to Home tab (NOT workout list)
      4. Assert mini-player is visible above tab bar
      5. Run: npx convex run workoutSessions:getActiveSession '{}' → assert status still "active"
    Expected Result: Session survives minimize, mini-player shows
    Evidence: .sisyphus/evidence/task-11-minimize.png

  Scenario: Complete workout marks session done
    Tool: dev-browser + Bash
    Steps:
      1. With active session open, add 1 exercise, log 1 set
      2. Tap "Finish" in header
      3. Assert Alert: "Finish workout?" with "Finish" and "Cancel"
      4. Tap "Finish"
      5. Assert navigation goes to /workout list
      6. Assert mini-player is NOT visible
      7. Run: npx convex data workoutSessions --limit 1 → assert status === "completed", durationSeconds > 0
    Expected Result: Session completed, no mini-player, DB updated
    Evidence: .sisyphus/evidence/task-11-complete.png

  Scenario: Block starting when active session exists
    Tool: dev-browser
    Steps:
      1. Have an active session for "Push Day"
      2. Navigate to workout list → tap Start on a DIFFERENT workout ("Leg Day")
      3. Assert Alert appears: "Active workout in progress" with dismiss option
      4. Assert NOT navigated to a new start screen for Leg Day
    Expected Result: Second session blocked, alert shown
    Evidence: .sisyphus/evidence/task-11-block-concurrent.png
  ```

  **Commit**: YES (commit 10)

---

- [ ] 12. Update (main)/_layout.tsx — render ActiveWorkoutMiniPlayer

  **What to do**:
  - Edit `apps/native/app/(main)/_layout.tsx`
  - Import `ActiveWorkoutMiniPlayer` from `@/components/workout/ActiveWorkoutMiniPlayer`
  - Render `<ActiveWorkoutMiniPlayer />` inside the layout, AFTER the `<NativeTabs>` block:
    ```typescript
    export default function MainLayout() {
      // ...existing code...
      return (
        <ThemeProvider value={...}>
          <NativeTabs>
            {/* ...existing triggers... */}
          </NativeTabs>
          <ActiveWorkoutMiniPlayer />
        </ThemeProvider>
      );
    }
    ```
  - The `Portal` inside `ActiveWorkoutMiniPlayer` handles its own z-index and positioning — no additional wrapper needed
  - Verify `PortalHost` exists in root `apps/native/app/_layout.tsx` (it should be at line ~72) — if missing, add `<PortalHost />` from `@rn-primitives/portal` at the end of the root layout's return

  **Must NOT do**:
  - Do NOT use `NativeTabs.BottomAccessory`
  - Do NOT wrap in extra View or absolute containers — the Portal handles positioning
  - Do NOT pass props to `ActiveWorkoutMiniPlayer` — it reads from Zustand internally

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3-line addition to existing layout file

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, after T10 and T11 are done)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 10 (component must exist), 11 (screen must exist so routing works)

  **References**:
  - `apps/native/app/(main)/_layout.tsx` — current 57-line file to edit (read before editing)
  - `apps/native/app/_layout.tsx:72` — confirm `PortalHost` location
  - `apps/native/components/workout/ActiveWorkoutMiniPlayer.tsx` — (T10)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Mini-player visible across all tabs
    Tool: dev-browser
    Steps:
      1. Start an active workout, tap minimize (chevron down)
      2. Assert mini-player is above tab bar on Home tab
      3. Tap "Explore" tab → assert mini-player still visible
      4. Tap "Profile" tab → assert mini-player still visible
      5. Tap "Settings" tab → assert mini-player still visible
    Expected Result: Mini-player persists across ALL tab navigations
    Evidence: .sisyphus/evidence/task-12-miniplayer-all-tabs.png
  ```

  **Commit**: YES (commit 11, with T13)

---

- [ ] 13. Update workout/_layout.tsx — configure start screen Stack options

  **What to do**:
  - Read `apps/native/app/(main)/workout/_layout.tsx`
  - Find the `[id]/start` Stack.Screen configuration (currently has `title: 'Start Workout'`)
  - Update its options to support the custom header:
    - Set `headerTitle: ''` (empty — the screen itself renders the timer via `navigation.setOptions`)
    - Set `headerBackVisible: false` (hide default back — the screen renders its own chevron-down minimize button)
    - Keep `headerStyle` (backgroundColor #151515) and `headerTintColor` (#00ff90) consistent with other workout screens
    - Set `gestureEnabled: false` — prevent swipe-back from accidentally ending session without confirmation
  - Also update barrel exports in `apps/native/components/workout/index.ts` to export all new components: `SetRow`, `ActiveExerciseCard`, `ExercisePicker`, `ActiveWorkoutMiniPlayer`

  **Must NOT do**:
  - Do NOT set `headerShown: false` — the header is needed (just customized)
  - Do NOT change other Stack.Screen configurations

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small config change + barrel export update

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 11 (need to know what options the screen needs)

  **References**:
  - `apps/native/app/(main)/workout/_layout.tsx` — current Stack layout to edit
  - `apps/native/components/workout/index.ts` — barrel to update with new exports

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: No default back button shown on active workout screen
    Tool: dev-browser
    Steps:
      1. Navigate to active workout screen
      2. Assert NO default iOS back arrow is visible in header
      3. Assert ONLY the custom chevron-down minimize button is visible on left
      4. Swipe right from left edge → assert swipe gesture is disabled (screen doesn't navigate back)
    Expected Result: Custom header controls only, no gesture navigation
    Evidence: .sisyphus/evidence/task-13-header-config.png
  ```

  **Commit**: YES (commit 11, with T12)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. For each "Must Have": verify implementation exists (read file, run convex CLI command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check `.sisyphus/evidence/` files exist. Compare deliverables list against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm turbo run check-types` (all packages) + `pnpm turbo run lint --filter=@native/app`. Review all changed files for: `StyleSheet.create`, `as any`, `@ts-ignore`, `console.log` in components, unused imports. Check for AI slop: excessive comments, over-abstraction, generic names (`data`/`result`/`item`).
  Output: `Types [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Visual QA — Full Workout Flow** — `unspecified-high`
  Use `dev-browser` skill. Launch app. Navigate to Workout tab → tap Start on a workout → verify active screen loads with timer. Tap Back → verify mini-player appears above tab bar with live time. Navigate to Home tab → verify mini-player still showing. Tap X on mini-player → verify Alert appears → confirm → verify session discarded. Start new workout → add a set → log it → Complete → verify session marked complete in Convex dashboard.
  Output: `Scenarios [N/N pass] | Evidence saved | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do" vs actual git diff. Verify 1:1 — nothing missing, nothing extra. Check "Must NOT do" compliance per task. Flag any unaccounted changes. Verify no rest timer, history, PR, or drag-and-drop code was added.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

1. `feat(backend): add workoutSessions table with session lifecycle mutations` — schema.ts, workoutSessions.ts
2. `feat(backend): add sessionExercises table with add/remove/reorder mutations` — schema.ts, sessionExercises.ts
3. `feat(backend): add sessionSets table with set logging mutations` — schema.ts, sessionSets.ts
4. `feat(backend): add optional exerciseType field to exercises schema` — schema.ts
5. `feat(native): add active session Zustand store and timer hook` — active-session-store.ts, use-workout-timer.ts
6. `feat(native): add Convex session API typed references` — session-api.ts
7. `feat(native): add SetRow and ActiveExerciseCard components` — SetRow.tsx, ActiveExerciseCard.tsx
8. `feat(native): add ExercisePicker bottom sheet component` — ExercisePicker.tsx
9. `feat(native): add ActiveWorkoutMiniPlayer component` — ActiveWorkoutMiniPlayer.tsx
10. `feat(native): replace start.tsx with interactive active workout screen` — start.tsx
11. `feat(native): integrate mini-player and exercise picker into navigation` — _layout.tsx (main + workout)

## Success Criteria

```bash
pnpm turbo run check-types --filter=@repo/backend   # Expected: 0 errors
pnpm turbo run check-types --filter=@native/app     # Expected: 0 errors
pnpm turbo run lint --filter=@native/app             # Expected: 0 warnings
npx convex dev                                       # Expected: compiles, deploys schema
npx convex run workoutSessions:getActiveSession '{}'  # Expected: null (no active session)
```
