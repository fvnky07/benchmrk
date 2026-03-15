# Create Workout Flow Plan

## TL;DR

> **Quick Summary**: Build a native multi-step workout creation flow backed by Convex, including seeded exercises, exercise detail/comments, free-tier workout limits, and an upgraded workouts tab that lists and starts saved workouts.
>
> **Deliverables**:
> - Native create-workout flow with exercise selection and exercise configuration
> - Convex schema, queries, mutations, and seed data for exercises, workouts, workout-exercise joins, and comments
> - Upgraded workouts tab with saved workout list and start entry point
> - Test infrastructure for both backend and native packages
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + final verification
> **Critical Path**: Task 1 → Task 4 → Task 8 → Task 13 → Task 16 → F1-F4

---

## Context

### Original Request
Create a function/flow so a user can create a workout from the native workouts tab, name the workout, pick exercises from the database, inspect exercise detail pages, leave comments, configure sets/reps/weight, save up to 3 workouts on free tier, and then start saved workouts from the workouts tab.

### Interview Summary
**Key Discussions**:
- Platform scope is **native app + backend** only.
- Exercise detail page **includes comments** in this plan.
- Broader exercise-database roadmap items are **out of scope** for now.
- In-progress create-workout state should be **discarded on exit**.
- Workouts tab should include **data hookup plus UI improvements**.
- Free-tier cap should be enforced in **both backend and UI**.
- A **minimal seeded exercise catalog** is required so the flow works end-to-end.
- **Automated tests should be set up first** because no framework currently exists.

**Research Findings**:
- Native multi-step patterns already exist in `apps/native/app/(auth)/register.tsx` and `apps/native/app/(auth)/create-profile.tsx`.
- Reusable list-row and list/detail navigation patterns exist in `apps/native/components/settings/SettingsRow.tsx` and `apps/native/app/(main)/settings/index.tsx`.
- Current workout area is skeletal: `apps/native/app/(main)/workout/index.tsx`, `create-workout.tsx`, and `_layout.tsx` exist but do not implement the requested flow.
- Current Convex schema in `packages/backend/convex/schema.ts` has no workout/exercise tables.
- No test framework exists yet in the root, native, or backend package manifests.

### Metis Review
**Identified Gaps** (addressed):
- Backend and native need **different test runners**: Vitest + `convex-test` for backend, Jest + `jest-expo` for native.
- Workout/exercise relationships should use a **junction table**, not embedded arrays.
- Exercise seeding should use an **internal Convex init step** early in the workflow.
- Free-tier enforcement should use an efficient count pattern like `.take(limit + 1)`.
- User auth in Convex should follow the codebase’s existing `identity.subject` pattern.
- Workout stack should define initial route behavior explicitly for clean navigation/back-stack handling.

---

## Work Objectives

### Core Objective
Deliver a production-shaped first version of workout creation in the native app, backed by Convex data models and seed data, while preserving clean routing, explicit free-tier rules, and a direct path from creation to saved-workout start.

### Concrete Deliverables
- Native workout stack expanded with create, select, exercise detail, configure, and saved-workout/start screens.
- New workout-related native components, store, and validation schemas.
- New Convex tables and functions for exercises, workouts, workout-exercise joins, and exercise comments.
- Seed mechanism for a minimal exercise catalog.
- Test infrastructure in `packages/backend/` and `apps/native/`.

### Definition of Done
- [ ] Native user can create a workout end-to-end from the workouts tab.
- [ ] Native user can open an exercise detail page by slug and post a comment.
- [ ] Free user is blocked from saving a 4th workout in both UI and backend.
- [ ] Saved workouts render in the workouts tab and expose a start action.
- [ ] Backend and native test commands run successfully for the new coverage.

### Must Have
- Multi-step native flow matching existing Expo Router conventions.
- Convex-backed exercise list and saved workout persistence.
- Exercise detail + comments support.
- Max 3 saved workouts for free tier.
- Minimal seed catalog for development and QA.

### Must NOT Have (Guardrails)
- No implementation of custom exercise submissions, moderation flows, progression trees, tagging system, modality-adaptive layouts, or verified-exercise icon systems.
- No persisted draft/resume behavior for unfinished workout creation.
- No embedded array schema for workout exercises where a relational join table is required.
- No human-only verification steps in acceptance criteria.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: TDD / tests-first infrastructure setup
- **Framework**:
  - `packages/backend/`: Vitest + `convex-test` + `@edge-runtime/vm`
  - `apps/native/`: Jest + `jest-expo` + `@testing-library/react-native`
- **If TDD**: Backend and native feature work should land only after test harnesses are present for the touched package.

### QA Policy
Every task includes agent-executed QA scenarios with saved evidence under `.sisyphus/evidence/`.

- **Frontend/UI**: Playwright-equivalent mobile/browser-capable validation where feasible, or tmux/Expo-driven command verification plus targeted component tests
- **CLI/TUI**: `interactive_bash` / tmux for dev servers and command output
- **API/Backend**: Bash/Convex commands or test runner output
- **Library/Module**: package-level test runs and type/lint output

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — foundations):
├── Task 1: Backend test infrastructure [quick]
├── Task 2: Native test infrastructure [quick]
├── Task 3: Native workout domain scaffolding (store/schemas/component folders) [quick]
├── Task 4: Convex workout/exercise schema design [deep]
└── Task 5: Workout navigation map and route scaffolding plan [quick]

Wave 2 (After Wave 1 — backend core, max parallel):
├── Task 6: Seed exercise catalog via Convex init [quick]
├── Task 7: Exercise query layer (list + slug detail) [unspecified-high]
├── Task 8: Workout persistence + free-tier enforcement [deep]
├── Task 9: Workout-exercise join/configuration mutations [deep]
└── Task 10: Exercise comments query/mutation layer [unspecified-high]

Wave 3 (After Wave 2 — native flow implementation):
├── Task 11: Workout tab redesign + saved list cards [visual-engineering]
├── Task 12: Create-workout step 1 (name + select exercises) [visual-engineering]
├── Task 13: Exercise detail + comments screen [visual-engineering]
├── Task 14: Configure exercises step (sets/reps/weight) [visual-engineering]
└── Task 15: Shared workout/exercise card-row components [quick]

Wave 4 (After Wave 3 — submit/start integration):
├── Task 16: Review/save flow with header continue/save controls [deep]
├── Task 17: Start-workout entry from saved workouts tab [unspecified-high]
├── Task 18: Native integration tests for critical screens/components [deep]
└── Task 19: Backend integration tests for workout rules/comments [deep]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA execution of all scenarios (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 4 → Task 8 → Task 13 → Task 16 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5

### Dependency Matrix

- **1**: — → 6,7,8,9,10,19
- **2**: — → 11,12,13,14,15,16,17,18
- **3**: — → 12,14,15,16
- **4**: 1 → 6,7,8,9,10
- **5**: 2 → 11,12,13,14,16,17
- **6**: 4 → 7,12,13
- **7**: 4,6 → 12,13,15
- **8**: 4,1 → 11,16,17,19
- **9**: 4,1 → 14,16,19
- **10**: 4,1 → 13,19
- **11**: 2,5,8 → 16,17,18
- **12**: 2,3,5,6,7,15 → 14,16,18
- **13**: 2,5,6,7,10,15 → 18
- **14**: 2,3,5,9,12,15 → 16,18
- **15**: 2,3,7 → 12,13,14,17,18
- **16**: 8,9,11,12,14 → 17,18,19
- **17**: 8,11,15,16 → 18
- **18**: 2,11,12,13,14,16,17 → F1-F4
- **19**: 1,8,9,10,16 → F1-F4

### Agent Dispatch Summary

- **1**: **5** — T1 `quick`, T2 `quick`, T3 `quick`, T4 `deep`, T5 `quick`
- **2**: **5** — T6 `quick`, T7 `unspecified-high`, T8 `deep`, T9 `deep`, T10 `unspecified-high`
- **3**: **5** — T11 `visual-engineering`, T12 `visual-engineering`, T13 `visual-engineering`, T14 `visual-engineering`, T15 `quick`
- **4**: **4** — T16 `deep`, T17 `unspecified-high`, T18 `deep`, T19 `deep`
- **FINAL**: **4** — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Set up backend workout test infrastructure

  **What to do**:
  - Add backend test runner support in `packages/backend/` using Vitest, `convex-test`, and `@edge-runtime/vm`.
  - Add package scripts/config so workout/exercise Convex functions can be tested without touching production data.
  - Add one smoke test proving the harness can run a Convex query/mutation test.

  **Must NOT do**:
  - Do not introduce Jest into `packages/backend/`.
  - Do not change app production behavior while setting up tests.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: focused package-level infra setup with limited surface area.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: not relevant to backend test infra.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: 6, 7, 8, 9, 10, 19
  - **Blocked By**: None

  **References**:
  - `packages/backend/package.json` - existing backend scripts and dependency baseline.
  - `packages/backend/AGENTS.md` - backend conventions and Convex-specific constraints.
  - Metis note: backend testing must use Vitest + `convex-test`, not Jest.

  **Acceptance Criteria**:
  - [ ] Backend package has a dedicated `test` script.
  - [ ] Backend test config exists and targets Convex-compatible runtime.
  - [ ] Smoke test runs successfully via package test command.

  **QA Scenarios**:
  ```
  Scenario: backend test harness runs smoke test
    Tool: Bash
    Preconditions: dependencies installed in workspace
    Steps:
      1. Run `pnpm --filter @repo/backend test`
      2. Observe Vitest boot and execute the smoke test file
      3. Assert process exits 0 and reports passing tests
    Expected Result: backend test runner passes with at least one executed test
    Failure Indicators: missing command, runtime mismatch, failing smoke test
    Evidence: .sisyphus/evidence/task-1-backend-test-harness.txt

  Scenario: wrong runner is not introduced
    Tool: Bash
    Preconditions: repository updated
    Steps:
      1. Inspect backend package test script and config paths
      2. Assert no Jest config/package is referenced in `packages/backend/`
    Expected Result: backend test stack is Vitest-based only
    Failure Indicators: Jest dependency or config added in backend package
    Evidence: .sisyphus/evidence/task-1-runner-validation.txt
  ```

  **Commit**: YES
  - Message: `chore(backend): add convex test infrastructure`
  - Files: `packages/backend/package.json`, `packages/backend/vitest.config.*`, backend smoke test files
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 2. Set up native workout test infrastructure

  **What to do**:
  - Add Jest Expo test support in `apps/native/` with React Native Testing Library.
  - Add package scripts/config and one smoke/component test for a simple native UI primitive or workout placeholder.
  - Ensure setup aligns with Expo/Metro constraints.

  **Must NOT do**:
  - Do not use Vitest for Expo React Native tests.
  - Do not add browser-only test tools as the native primary framework.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: package-scoped infra change with known Expo constraints.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: useful after UI changes, but not for initial infra setup.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11, 12, 13, 14, 15, 16, 17, 18
  - **Blocked By**: None

  **References**:
  - `apps/native/package.json` - existing scripts and dependency baseline.
  - `apps/native/AGENTS.md` - native app conventions, NativeWind, Expo Router constraints.
  - Metis note: native testing must use Jest + `jest-expo`.

  **Acceptance Criteria**:
  - [ ] Native package has a dedicated `test` script.
  - [ ] Jest Expo config/setup is present.
  - [ ] At least one native smoke/component test passes.

  **QA Scenarios**:
  ```
  Scenario: native test harness runs smoke test
    Tool: Bash
    Preconditions: native dependencies installed
    Steps:
      1. Run `pnpm --filter @native/app test`
      2. Observe Jest execute the smoke/component test
      3. Assert exit code 0 and pass summary output
    Expected Result: native test runner is operational
    Failure Indicators: Metro/Jest config errors, no tests discovered, failed smoke test
    Evidence: .sisyphus/evidence/task-2-native-test-harness.txt

  Scenario: Expo-compatible runner is used
    Tool: Bash
    Preconditions: native package updated
    Steps:
      1. Inspect `apps/native/package.json` and test config
      2. Assert `jest-expo` is the configured preset/basis
    Expected Result: native package uses Expo-compatible Jest setup
    Failure Indicators: Vitest config in native package or missing Expo preset
    Evidence: .sisyphus/evidence/task-2-runner-validation.txt
  ```

  **Commit**: YES
  - Message: `chore(native): add expo test infrastructure`
  - Files: `apps/native/package.json`, jest setup/config files, smoke tests
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 3. Scaffold native workout feature state and validation domain

  **What to do**:
  - Add workout-specific store/schema/module scaffolding under native `lib/` and component directories.
  - Define the state shape for workout title, selected exercise IDs, exercise configs, current step, and reset-on-exit behavior.
  - Define validation schemas for workout naming and per-exercise configuration.

  **Must NOT do**:
  - Do not persist drafts across app exits or navigation exits.
  - Do not mix auth state into workout feature state.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: compact state/schema scaffolding with limited UI surface.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: better applied after actual React UI screens exist.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 12, 14, 15, 16
  - **Blocked By**: None

  **References**:
  - `apps/native/lib/auth/store.ts` - Zustand pattern for simple cross-screen state.
  - `apps/native/lib/hooks/use-form-validation.ts` - existing schema-driven validation flow.
  - `apps/native/lib/index.ts` - barrel export pattern for new feature utilities.

  **Acceptance Criteria**:
  - [ ] Workout creation store exposes set/reset/update actions for each flow step.
  - [ ] Validation schemas exist for workout metadata and exercise configuration.
  - [ ] Store reset behavior is explicit and testable.

  **QA Scenarios**:
  ```
  Scenario: workout store resets cleanly on exit action
    Tool: Bash
    Preconditions: native unit tests added for workout store
    Steps:
      1. Run targeted native test covering store lifecycle
      2. Assert state populates after set actions
      3. Assert reset action clears title, selections, and configs
    Expected Result: unfinished drafts do not persist after reset
    Failure Indicators: stale state remains after reset
    Evidence: .sisyphus/evidence/task-3-store-reset.txt

  Scenario: invalid workout config is rejected by schema
    Tool: Bash
    Preconditions: validation test exists
    Steps:
      1. Run targeted schema test with invalid sets/reps/weight payload
      2. Assert schema returns validation failure
    Expected Result: invalid payloads fail validation
    Failure Indicators: malformed payload unexpectedly passes schema
    Evidence: .sisyphus/evidence/task-3-schema-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add workout creation state and schemas`
  - Files: native workout store/schema/module files and barrel exports
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 4. Define Convex schema for exercises, workouts, workout-exercise joins, and comments

  **What to do**:
  - Extend `packages/backend/convex/schema.ts` with tables for exercises, workouts, workout-exercise joins, and exercise comments.
  - Add indexes for all required read paths, especially workout-to-exercise and exercise-to-workout traversal.
  - Include fields needed for slug lookup, image/description display, comments, workout metadata, configuration order, and free-tier enforcement.

  **Must NOT do**:
  - Do not use embedded arrays as the only source of truth for workout exercise relationships.
  - Do not omit slug/index fields required for detail routing.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: schema decisions affect all downstream queries/mutations and future extensibility.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: frontend-only, not relevant here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6, 7, 8, 9, 10
  - **Blocked By**: 1

  **References**:
  - `packages/backend/convex/schema.ts` - existing schema definition style.
  - `packages/backend/AGENTS.md` - schema-first Convex workflow requirement.
  - Metis guidance: use a dedicated join table with `by_workout`, `by_exercise`, and combined lookup indexes.

  **Acceptance Criteria**:
  - [ ] All new tables are declared in the main Convex schema.
  - [ ] Join table indexes support both workout-first and exercise-first lookups.
  - [ ] Comment table supports lookup by exercise and chronological ordering.

  **QA Scenarios**:
  ```
  Scenario: Convex schema generates without errors
    Tool: Bash
    Preconditions: schema updated
    Steps:
      1. Run backend generation/dev validation command required by project workflow
      2. Assert schema compiles and generated artifacts update successfully
    Expected Result: no schema validation errors
    Failure Indicators: invalid validators, duplicate indexes, generation failure
    Evidence: .sisyphus/evidence/task-4-schema-generation.txt

  Scenario: join-table indexes support intended relationships
    Tool: Bash
    Preconditions: backend tests cover relationship queries
    Steps:
      1. Run targeted backend relationship test
      2. Assert exercises can be fetched by workout and workouts can be traced by exercise
    Expected Result: both traversal directions pass
    Failure Indicators: missing/incorrect indexes or failing relationship queries
    Evidence: .sisyphus/evidence/task-4-relationship-indexes.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add workout and exercise schema`
  - Files: `packages/backend/convex/schema.ts`
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 5. Expand workout stack routing and navigation contract

  **What to do**:
  - Update the workout stack structure and route map to support multi-step creation, exercise slug detail, review/save, and saved workout start flows.
  - Define header behavior for continue/save actions and initial route/back-stack behavior.
  - Ensure route naming is consistent with Expo Router conventions already used in the app.

  **Must NOT do**:
  - Do not create ad hoc navigation outside the workout stack without clear justification.
  - Do not leave deep-link/back navigation behavior ambiguous.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: routing structure is focused and mainly depends on existing conventions.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: useful later after screen code exists.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11, 12, 13, 14, 16, 17
  - **Blocked By**: 2

  **References**:
  - `apps/native/app/(main)/workout/_layout.tsx` - current workout stack setup.
  - `apps/native/app/(auth)/register.tsx` - push/replace navigation pattern between steps.
  - Metis note: add `unstable_settings.initialRouteName` or equivalent explicit initial routing behavior.

  **Acceptance Criteria**:
  - [ ] Workout route plan covers index, create/select, detail-by-slug, configure, review/save, and start-entry screens.
  - [ ] Header action ownership is defined for step transitions.
  - [ ] Back navigation behavior is explicit and consistent.

  **QA Scenarios**:
  ```
  Scenario: workout routes resolve without navigation config errors
    Tool: Bash
    Preconditions: native route files/layout updated
    Steps:
      1. Run native typecheck or route-validation command
      2. Assert stack screen names and route file paths resolve cleanly
    Expected Result: routing compiles with no missing screen references
    Failure Indicators: invalid route names, header option errors, type failures
    Evidence: .sisyphus/evidence/task-5-route-validation.txt

  Scenario: deep-linked detail route preserves sane back behavior
    Tool: Bash
    Preconditions: navigation tests or route assertions exist
    Steps:
      1. Execute targeted navigation test for direct entry to exercise detail route
      2. Assert back action returns to workout root or expected parent screen
    Expected Result: no orphaned or broken back-stack behavior
    Failure Indicators: crash, blank back target, incorrect root return
    Evidence: .sisyphus/evidence/task-5-backstack.txt
  ```

  **Commit**: YES
  - Message: `feat(native): define workout route flow`
  - Files: workout layout/routes
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 6. Seed a minimal exercise catalog for end-to-end flow validation

  **What to do**:
  - Add an internal Convex init/seed mechanism that inserts a minimal but realistic exercise catalog.
  - Ensure seeded exercises include slug, name, short description, long description/detail copy, and image reference fields needed by the native flow.
  - Make the seed operation safe to rerun without duplicating rows.

  **Must NOT do**:
  - Do not expose seeding as a public client mutation.
  - Do not rely on manual dashboard inserts for QA readiness.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: tightly scoped data bootstrap task.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: not relevant to backend seed logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10)
  - **Blocks**: 7, 12, 13
  - **Blocked By**: 4

  **References**:
  - `packages/backend/AGENTS.md` - backend conventions.
  - Metis guidance: use `internalMutation` in `packages/backend/convex/init.ts` and make seed idempotent.

  **Acceptance Criteria**:
  - [ ] Seed file exists using internal-only execution path.
  - [ ] Rerunning the seed does not duplicate exercise records.
  - [ ] Seeded catalog covers enough records for multi-select UI QA.

  **QA Scenarios**:
  ```
  Scenario: seed script populates exercise catalog
    Tool: Bash
    Preconditions: schema is available and backend dev environment is ready
    Steps:
      1. Run the documented Convex init/seed command
      2. Assert command exits successfully
      3. Run a verification query/test that confirms exercises now exist
    Expected Result: minimal exercise catalog is present
    Failure Indicators: seed command error or zero exercises returned
    Evidence: .sisyphus/evidence/task-6-seed-run.txt

  Scenario: seed script is idempotent
    Tool: Bash
    Preconditions: seed already executed once
    Steps:
      1. Run the seed command a second time
      2. Assert verification query/test shows no duplicate growth beyond expected count
    Expected Result: rerun is safe and does not create duplicates
    Failure Indicators: duplicate rows or second-run failure
    Evidence: .sisyphus/evidence/task-6-seed-idempotency.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): seed exercise catalog`
  - Files: seed/init files and any supporting constants
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 7. Implement exercise query layer for list and slug detail retrieval

  **What to do**:
  - Add Convex queries for fetching the exercise selection list and individual exercise detail by slug.
  - Ensure response shape supports selection-list cards and detailed exercise pages.
  - Support stable ordering and empty/loading-safe behavior expected by the native UI.

  **Must NOT do**:
  - Do not couple list responses to comments payloads if a lighter summary shape is sufficient.
  - Do not expose internal-only seed metadata to the client.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: backend query design with client-facing contract decisions.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: not backend-facing.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 12, 13, 15
  - **Blocked By**: 4, 6

  **References**:
  - `packages/backend/convex/profile.ts` - existing query/mutation file layout style.
  - `apps/native/app/(main)/settings/index.tsx` - `useQuery` consumption pattern with loading/null handling.
  - User requirement: list items must expose image, name, description, and detail navigation affordance.

  **Acceptance Criteria**:
  - [ ] Query returns exercise summaries for mapped list rendering.
  - [ ] Query returns exercise detail by slug.
  - [ ] Query contract supports seeded image/name/description fields.

  **QA Scenarios**:
  ```
  Scenario: exercise list query returns mapped-card data
    Tool: Bash
    Preconditions: seeded catalog exists
    Steps:
      1. Run targeted backend test for list query
      2. Assert returned rows contain slug, image reference, name, and summary description
    Expected Result: native selection screen has all required display fields
    Failure Indicators: missing fields, empty result despite seed data, unstable ordering
    Evidence: .sisyphus/evidence/task-7-exercise-list.txt

  Scenario: exercise slug query rejects unknown slugs gracefully
    Tool: Bash
    Preconditions: detail query implemented
    Steps:
      1. Run targeted backend test using a nonexistent slug
      2. Assert function returns expected null/error contract without crashing
    Expected Result: unknown slug is handled safely
    Failure Indicators: uncaught error or incorrect payload
    Evidence: .sisyphus/evidence/task-7-exercise-slug-error.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add exercise queries`
  - Files: exercise query module(s)
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 8. Implement workout persistence and free-tier save enforcement

  **What to do**:
  - Add Convex mutations/queries for creating and listing user workouts.
  - Enforce the max-3 free-tier save rule in backend logic using the authenticated user identity.
  - Return a client-friendly error contract so UI can show an upgrade/limit message before or after submit attempts.

  **Must NOT do**:
  - Do not enforce the cap only in the client.
  - Do not use an unbounded collect when a capped count check is sufficient.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: core business rule and persistence layer with auth, limits, and read/write contracts.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: irrelevant to backend business logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11, 16, 17, 19
  - **Blocked By**: 4, 1

  **References**:
  - `packages/backend/convex/userPreferences.ts` - authenticated-user pattern via `ctx.auth.getUserIdentity()` and `identity.subject`.
  - Metis guidance: use `.take(FREE_TIER_LIMIT + 1)` or equivalent bounded count strategy.
  - User decision: block creation of the 4th stored workout.

  **Acceptance Criteria**:
  - [ ] Authenticated user can create a workout below the cap.
  - [ ] Authenticated free user is rejected on the 4th save.
  - [ ] Listing query returns saved workouts for workouts tab rendering.

  **QA Scenarios**:
  ```
  Scenario: free user can save up to three workouts
    Tool: Bash
    Preconditions: backend test harness and auth identity helpers available
    Steps:
      1. Run targeted backend test that creates three workouts for one free user
      2. Assert all first three saves succeed
      3. Assert list query returns exactly three workouts
    Expected Result: free-tier quota allows first three saves
    Failure Indicators: premature rejection or incorrect count
    Evidence: .sisyphus/evidence/task-8-free-tier-pass.txt

  Scenario: free user is blocked on fourth save
    Tool: Bash
    Preconditions: same user already has three workouts
    Steps:
      1. Run targeted backend test attempting a fourth save
      2. Assert mutation returns expected limit error contract
    Expected Result: backend hard-stops the fourth save
    Failure Indicators: fourth workout persists or wrong error surface
    Evidence: .sisyphus/evidence/task-8-free-tier-block.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add workout mutations and limits`
  - Files: workout persistence module(s)
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 9. Implement workout-exercise join and configuration mutations

  **What to do**:
  - Add Convex logic for attaching selected exercises to a workout via the join table.
  - Support storing order plus per-exercise sets, reps, and weight configuration.
  - Ensure downstream queries can reconstruct a workout in selected order for start/review screens.

  **Must NOT do**:
  - Do not store exercise configuration only in transient client state.
  - Do not collapse multiple concerns into opaque JSON blobs if queryable fields are needed.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: relationship modeling and mutation integrity are core data-layer concerns.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: not relevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 14, 16, 19
  - **Blocked By**: 4, 1

  **References**:
  - Metis guidance: dedicated join table with relationship indexes.
  - User requirement: per exercise, user customizes sets, reps, and weight before submit.

  **Acceptance Criteria**:
  - [ ] Mutation layer can persist selected exercises with explicit order.
  - [ ] Per-exercise sets/reps/weight configuration persists.
  - [ ] Retrieval path returns exercises in saved order.

  **QA Scenarios**:
  ```
  Scenario: configured exercises persist in order
    Tool: Bash
    Preconditions: workout and seeded exercises exist in test context
    Steps:
      1. Run targeted backend test creating a workout with multiple ordered exercises
      2. Persist distinct sets/reps/weight values for each
      3. Query workout detail and assert order plus config values match input
    Expected Result: saved workout returns ordered configured exercises
    Failure Indicators: missing join rows, wrong order, wrong config values
    Evidence: .sisyphus/evidence/task-9-config-order.txt

  Scenario: invalid exercise attachment fails safely
    Tool: Bash
    Preconditions: mutation validation present
    Steps:
      1. Run targeted backend test with nonexistent exercise id or malformed config
      2. Assert mutation rejects input with expected error
    Expected Result: invalid relationship/config data is not saved
    Failure Indicators: bad data persists or unhandled crash
    Evidence: .sisyphus/evidence/task-9-invalid-attachment.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add workout exercise configuration logic`
  - Files: workout-exercise module(s)
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 10. Implement exercise comment queries and mutations

  **What to do**:
  - Add backend functions to read comments for an exercise and create a new comment by an authenticated user.
  - Include the minimum user-display information needed for comment rendering.
  - Define ordering and empty-state behavior for comments.

  **Must NOT do**:
  - Do not overbuild social features beyond basic comment creation/listing.
  - Do not require unrelated profile redesign work to ship comments.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: compact feature, but it introduces authenticated social-style writes.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: backend-focused task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13, 19
  - **Blocked By**: 4, 1

  **References**:
  - `packages/backend/convex/userPreferences.ts` - existing auth and mutation style.
  - User requirement: exercise detail page supports comments.

  **Acceptance Criteria**:
  - [ ] Exercise detail can fetch comments in deterministic order.
  - [ ] Authenticated user can post a comment.
  - [ ] Empty comment state is representable without errors.

  **QA Scenarios**:
  ```
  Scenario: authenticated user posts and retrieves exercise comment
    Tool: Bash
    Preconditions: seeded exercise exists and auth identity is mocked in backend test
    Steps:
      1. Run targeted backend test creating a comment for an exercise
      2. Query comments for that exercise
      3. Assert new comment appears with expected body and author display data
    Expected Result: comment round-trip succeeds
    Failure Indicators: comment not persisted, wrong author data, wrong sort order
    Evidence: .sisyphus/evidence/task-10-comment-roundtrip.txt

  Scenario: empty comment submission is rejected
    Tool: Bash
    Preconditions: validation in place
    Steps:
      1. Run targeted backend test with empty or whitespace-only comment input
      2. Assert mutation rejects the payload
    Expected Result: invalid comment body is blocked
    Failure Indicators: empty comment saved or unhandled exception
    Evidence: .sisyphus/evidence/task-10-comment-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add exercise comments logic`
  - Files: exercise comment module(s)
  - Pre-commit: `pnpm --filter @repo/backend test`

- [x] 11. Redesign workouts tab to show saved workouts and create entry point

  **What to do**:
  - Replace the current button-only `workout/index` experience with a saved-workouts overview.
  - Add a clear create-workout CTA while also surfacing saved workout cards/list items.
  - Ensure saved entries support a start action and reflect empty-state/loading-state conditions cleanly.

  **Must NOT do**:
  - Do not leave newly created workouts hidden from the tab.
  - Do not add unrelated dashboard analytics or placeholder-only UI.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: user-facing tab redesign and interaction polish.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: useful after React Native screen changes to catch UI/component issues early.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: unavailable in current skill list.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16, 17, 18
  - **Blocked By**: 2, 5, 8

  **References**:
  - `apps/native/app/(main)/workout/index.tsx` - current placeholder start point.
  - `apps/native/app/(main)/settings/index.tsx` - loading/error-state handling with Convex data.
  - `apps/native/components/settings/SettingsRow.tsx` - compact row interaction pattern.

  **Acceptance Criteria**:
  - [ ] Workouts tab shows loading, empty, and populated states.
  - [ ] Create CTA is still prominent.
  - [ ] Saved workouts show a start affordance.

  **QA Scenarios**:
  ```
  Scenario: workouts tab shows empty state with create CTA
    Tool: Bash
    Preconditions: test user has zero saved workouts
    Steps:
      1. Run native test for workouts tab empty state
      2. Assert empty-state copy renders and create CTA is visible
    Expected Result: user sees clear next action when no workouts exist
    Failure Indicators: blank screen or missing create CTA
    Evidence: .sisyphus/evidence/task-11-empty-state.txt

  Scenario: workouts tab renders saved workouts with start controls
    Tool: Bash
    Preconditions: mocked/synthetic data includes saved workouts
    Steps:
      1. Run native test for populated workouts tab
      2. Assert workout cards/rows render with title and start action
    Expected Result: saved workouts are visible and actionable
    Failure Indicators: missing list items or no start affordance
    Evidence: .sisyphus/evidence/task-11-saved-list.txt
  ```

  **Commit**: YES
  - Message: `feat(native): upgrade workouts tab and saved list`
  - Files: `apps/native/app/(main)/workout/index.tsx`, workout display components
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 12. Build create-workout step for naming and selecting exercises

  **What to do**:
  - Implement the screen where the user enters workout name and selects multiple exercises from backend data.
  - Render each exercise row/card with left image, name, description, and a view button leading to detail.
  - Support multi-select state and header-driven continue behavior to the next step.

  **Must NOT do**:
  - Do not fetch hardcoded exercise data once backend queries exist.
  - Do not allow continue with an invalid/empty selection state unless explicitly designed.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: primary user-facing flow screen with list layout and selection UX.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: valuable after React screen changes.
  - **Skills Evaluated but Omitted**:
    - `playwright`: browser-only skill; native screen work is better covered by tests/Expo validation here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 14, 16, 18
  - **Blocked By**: 2, 3, 5, 6, 7, 15

  **References**:
  - `apps/native/app/(auth)/register.tsx` - multi-step form submission and next-step navigation pattern.
  - `apps/native/app/(main)/settings/index.tsx` - Convex query loading/error rendering pattern.
  - User requirement: list item contains image on left, name, description, and view button.

  **Acceptance Criteria**:
  - [ ] User can enter a workout name.
  - [ ] Exercise list is fetched from backend and rendered as mapped items/cards.
  - [ ] User can select multiple exercises and continue from the header control.

  **QA Scenarios**:
  ```
  Scenario: user selects multiple exercises and continues
    Tool: Bash
    Preconditions: native integration/component test covers create-workout step with seeded/mock exercises
    Steps:
      1. Render create-workout step
      2. Enter `Push Day A` into workout name input
      3. Select at least two exercise rows
      4. Trigger header continue action
      5. Assert navigation advances to configuration step
    Expected Result: valid multi-select workflow advances
    Failure Indicators: header action disabled incorrectly or selection not persisted
    Evidence: .sisyphus/evidence/task-12-multiselect-continue.txt

  Scenario: invalid state blocks continue
    Tool: Bash
    Preconditions: validation wired to screen
    Steps:
      1. Render create-workout step with no selected exercises or empty title
      2. Trigger continue action
      3. Assert validation message/state is shown and navigation does not advance
    Expected Result: user cannot continue with invalid input
    Failure Indicators: screen advances with empty/invalid state
    Evidence: .sisyphus/evidence/task-12-validation-block.txt
  ```

  **Commit**: YES
  - Message: `feat(native): build workout name and exercise selection step`
  - Files: create/select workout screens and hooks/components
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 13. Build exercise detail screen with comments

  **What to do**:
  - Implement slug-based exercise detail navigation and screen rendering.
  - Show detailed exercise content plus a comments section with read/write capability.
  - Ensure the screen can be opened from the selection step without losing create-workout context.

  **Must NOT do**:
  - Do not turn comments into a broader social feed feature.
  - Do not lose selected-workout in-memory state when user returns from detail view.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: detail UI plus comment interaction requires careful screen composition.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: appropriate after React Native screen changes.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not primary for this native flow.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 18
  - **Blocked By**: 2, 5, 6, 7, 10, 15

  **References**:
  - `apps/native/app/(main)/workout/_layout.tsx` - workout stack options baseline.
  - `apps/native/app/(main)/settings/index.tsx` - detail navigation and data-loading pattern.
  - User requirement: detail page should show details/description and support comments.

  **Acceptance Criteria**:
  - [ ] Detail screen resolves by exercise slug.
  - [ ] Exercise detail content renders name/description/image and any extended copy included in seed/query contract.
  - [ ] User can read and submit comments from the detail screen.

  **QA Scenarios**:
  ```
  Scenario: user opens exercise detail and returns to creation flow
    Tool: Bash
    Preconditions: native integration test covers exercise selection → detail navigation
    Steps:
      1. Render create-workout step with one exercise row
      2. Tap the row’s view-detail action
      3. Assert detail screen renders expected exercise content
      4. Navigate back
      5. Assert prior create-workout selections still exist in state
    Expected Result: detail route works without losing flow context
    Failure Indicators: missing detail data or lost selection state on return
    Evidence: .sisyphus/evidence/task-13-detail-return.txt

  Scenario: user submits comment from detail screen
    Tool: Bash
    Preconditions: comments UI wired to backend mutation/query
    Steps:
      1. Render exercise detail screen with authenticated mock state
      2. Enter `Great chest finisher` into comment input
      3. Submit comment
      4. Assert new comment appears in the list
    Expected Result: comment write and refresh path succeeds
    Failure Indicators: submit button no-ops, validation failure for valid text, list not updating
    Evidence: .sisyphus/evidence/task-13-comment-submit.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add exercise detail and comments screen`
  - Files: exercise detail screen and related hooks/components
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 14. Build exercise configuration step for sets, reps, and weight

  **What to do**:
  - Implement the next-step screen where each selected exercise gets configurable sets, reps, and weight fields.
  - Bind the step to workout store state and backend-ready payload shape.
  - Preserve configured exercise order from the selection step.

  **Must NOT do**:
  - Do not flatten all exercises into a single shared config.
  - Do not allow obviously invalid numeric values to slip through unchecked.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: form-heavy screen with repeated interactive items.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: useful after React form work.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not primary for native.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16, 18
  - **Blocked By**: 2, 3, 5, 9, 12, 15

  **References**:
  - `apps/native/app/(auth)/create-profile.tsx` - multi-field submission and local state pattern.
  - User requirement: customize sets and reps and weight of each exercise before submit.

  **Acceptance Criteria**:
  - [ ] Each selected exercise renders editable sets/reps/weight controls.
  - [ ] Config changes are saved in feature state and align with backend payload shape.
  - [ ] Invalid values are blocked or surfaced before continue/save.

  **QA Scenarios**:
  ```
  Scenario: user configures each selected exercise independently
    Tool: Bash
    Preconditions: native test with two selected exercises exists
    Steps:
      1. Render configuration step with two exercises
      2. Set distinct values for sets/reps/weight on each exercise
      3. Assert store state reflects unique values per exercise
    Expected Result: per-exercise configuration stays independent
    Failure Indicators: one edit overwrites another exercise’s values
    Evidence: .sisyphus/evidence/task-14-independent-config.txt

  Scenario: invalid numeric configuration is blocked
    Tool: Bash
    Preconditions: validation messages wired to fields
    Steps:
      1. Enter invalid values such as zero sets or negative weight
      2. Trigger continue/save
      3. Assert validation prevents progress
    Expected Result: invalid config cannot proceed
    Failure Indicators: flow advances with malformed numeric values
    Evidence: .sisyphus/evidence/task-14-invalid-config.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add exercise configuration step`
  - Files: config-step screens/components/hooks
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 15. Build shared workout and exercise presentation components

  **What to do**:
  - Create reusable native components for exercise rows/cards and saved workout cards/rows.
  - Ensure components support required visual structure: image left, title, description, action buttons, and selected/saved states.
  - Keep component APIs aligned with actual flow usage rather than speculative reuse.

  **Must NOT do**:
  - Do not introduce over-abstracted generic cards without a real consumer.
  - Do not duplicate styling logic across the create and workouts-tab flows when a shared component is justified.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: shared UI building blocks scoped to one feature domain.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: helpful for validating React component issues after creation.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not primary for component authoring.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 12, 13, 14, 17, 18
  - **Blocked By**: 2, 3, 7

  **References**:
  - `apps/native/components/settings/SettingsRow.tsx` - compact row component pattern.
  - `apps/native/components/ui/button.tsx` - shared native UI conventions.
  - User requirement: list items show image, name, description, and detail affordance.

  **Acceptance Criteria**:
  - [ ] Exercise row/card component supports image, title, description, selection, and detail action.
  - [ ] Workout card/row component supports workout summary and start action.
  - [ ] Components are used by the screens they were built for.

  **QA Scenarios**:
  ```
  Scenario: exercise component renders all required visual slots
    Tool: Bash
    Preconditions: component test exists
    Steps:
      1. Render exercise row/card with mock props
      2. Assert image slot, title text, description text, and detail button all render
    Expected Result: component matches required content structure
    Failure Indicators: missing slot, inaccessible action, incorrect prop binding
    Evidence: .sisyphus/evidence/task-15-exercise-component.txt

  Scenario: workout component exposes start action
    Tool: Bash
    Preconditions: component test exists
    Steps:
      1. Render saved workout card/row with mock workout data
      2. Assert start control is visible and press handler is called
    Expected Result: saved workout component is actionable
    Failure Indicators: start control absent or onPress not wired
    Evidence: .sisyphus/evidence/task-15-workout-component.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add workout and exercise card components`
  - Files: `apps/native/components/workout/*`
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 16. Build review/save step with header actions and UI limit messaging

  **What to do**:
  - Implement the final review/save step that summarizes the workout before submission.
  - Wire header save/continue actions to backend create flow and join/config persistence.
  - Surface free-tier warning/blocking UI before and/or after backend rejection in a user-friendly way.

  **Must NOT do**:
  - Do not hide the cap error only in logs.
  - Do not save partial workout data silently if final submit fails.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: final integration point combining routing, state, backend writes, and business rules.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: helpful after completing major React flow integration.
  - **Skills Evaluated but Omitted**:
    - `playwright`: native flow not primary browser target.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 17, 18, 19
  - **Blocked By**: 8, 9, 11, 12, 14

  **References**:
  - `apps/native/app/(auth)/create-profile.tsx` - async submit + success/failure feedback pattern.
  - `apps/native/lib/ui` toast usage pattern via existing screens.
  - User decision: backend + UI should both enforce the limit.

  **Acceptance Criteria**:
  - [ ] Review step shows workout summary before submit.
  - [ ] Successful save persists workout and returns user to a visible saved-workout experience.
  - [ ] Limit error is surfaced clearly when user attempts a 4th save.

  **QA Scenarios**:
  ```
  Scenario: valid workout saves successfully from review step
    Tool: Bash
    Preconditions: user under free-tier cap, native integration test with mocked backend success
    Steps:
      1. Render review step with valid workout state
      2. Trigger save header action
      3. Assert save mutation is called with expected payload
      4. Assert navigation returns to workouts tab or saved-workout success state
    Expected Result: completed workout is saved and surfaced back in workout area
    Failure Indicators: no mutation call, navigation failure, missing saved confirmation
    Evidence: .sisyphus/evidence/task-16-save-success.txt

  Scenario: 4th workout attempt shows limit block
    Tool: Bash
    Preconditions: backend mocked to return free-tier limit error
    Steps:
      1. Trigger save from review step
      2. Assert UI renders limit messaging and save does not complete
    Expected Result: user is blocked and informed clearly
    Failure Indicators: silent failure, generic crash, workout still appears saved
    Evidence: .sisyphus/evidence/task-16-save-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add workout review and save flow`
  - Files: review/save screens, navigation options, mutation wiring
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 17. Add start-workout entry flow from saved workouts tab

  **What to do**:
  - Implement the minimal start action path for a saved workout from the workouts tab.
  - Define the first runnable/startable screen or handoff for a saved routine.
  - Ensure the start entry uses saved workout exercise order/config, not placeholder data.

  **Must NOT do**:
  - Do not invent a fully featured workout-tracking runtime if only a start entry is needed.
  - Do not leave the start CTA as a dead-end button.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: integration touchpoint with some product ambiguity, but still scoped.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: useful after connecting React screens.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not primary here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 18
  - **Blocked By**: 8, 11, 15, 16

  **References**:
  - `apps/native/app/(main)/workout/index.tsx` - existing workout tab entry point.
  - User requirement: created workout can then be started from the workouts tab.

  **Acceptance Criteria**:
  - [ ] Saved workout list includes working start CTA.
  - [ ] Start action routes to a concrete screen/state, not a stub.
  - [ ] Started workout reflects saved exercise order/config.

  **QA Scenarios**:
  ```
  Scenario: user starts a saved workout from workouts tab
    Tool: Bash
    Preconditions: native integration test with one saved workout available
    Steps:
      1. Render populated workouts tab
      2. Trigger the start action on one saved workout
      3. Assert navigation reaches the defined start screen/state
      4. Assert selected workout data is loaded in saved order
    Expected Result: start CTA launches a real saved routine entry path
    Failure Indicators: dead-end button, wrong workout data, wrong order
    Evidence: .sisyphus/evidence/task-17-start-flow.txt

  Scenario: missing workout data is handled gracefully
    Tool: Bash
    Preconditions: start action test simulates stale/missing workout reference
    Steps:
      1. Trigger start with an unavailable workout record
      2. Assert user sees safe failure messaging instead of crash
    Expected Result: stale data path fails gracefully
    Failure Indicators: crash or blank screen
    Evidence: .sisyphus/evidence/task-17-start-missing.txt
  ```

  **Commit**: YES
  - Message: `feat(native): add saved workout start flow`
  - Files: workout start entry screens/wiring
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 18. Add native integration tests for workout creation critical path

  **What to do**:
  - Add native tests covering the key screens/components in the create-workout flow and workouts tab.
  - Cover selection, detail navigation, configuration, review/save, and start-entry behaviors.
  - Ensure tests focus on critical user outcomes instead of shallow snapshots only.

  **Must NOT do**:
  - Do not rely only on snapshot tests for behavior-heavy screens.
  - Do not skip negative-path coverage for validation and limit states.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: cross-screen behavior validation for the core user journey.
  - **Skills**: [`react-doctor`]
    - `react-doctor`: complements React screen verification.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not primary for Expo-native test infrastructure.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: 2, 11, 12, 13, 14, 16, 17

  **References**:
  - Tasks 2, 11, 12, 13, 14, 16, 17 - implemented behaviors to cover.
  - User requirement set: end-to-end create → save → start flow plus comment interactions.

  **Acceptance Criteria**:
  - [ ] Native tests cover happy path for create/save/start flow.
  - [ ] Native tests cover validation and limit-error states.
  - [ ] Native tests cover detail/comments interaction at least at component/integration boundary.

  **QA Scenarios**:
  ```
  Scenario: native critical-path test suite passes
    Tool: Bash
    Preconditions: native tests implemented
    Steps:
      1. Run `pnpm --filter @native/app test`
      2. Assert workout-related integration tests execute and pass
    Expected Result: critical path is covered and green
    Failure Indicators: failing tests, skipped critical-path cases, unstable async assertions
    Evidence: .sisyphus/evidence/task-18-native-suite.txt

  Scenario: negative-path native cases are present
    Tool: Bash
    Preconditions: test files implemented
    Steps:
      1. Inspect or run tests specifically covering invalid continue, free-tier limit, and missing start data
      2. Assert these cases execute as part of the suite
    Expected Result: major failure paths are automated
    Failure Indicators: no negative-path coverage
    Evidence: .sisyphus/evidence/task-18-negative-paths.txt
  ```

  **Commit**: YES
  - Message: `test(native): cover workout creation flow`
  - Files: native test files around workout feature
  - Pre-commit: `pnpm --filter @native/app test`

- [x] 19. Add backend integration tests for workout rules, joins, and comments

  **What to do**:
  - Add backend tests for exercise queries, workout creation, free-tier limits, join persistence, and comments.
  - Cover authenticated and invalid-input paths.
  - Ensure tests document the intended business rules for future maintenance.

  **Must NOT do**:
  - Do not leave core limit/join/comment behavior validated only through UI tests.
  - Do not skip auth-boundary tests for write operations.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: business rules and data integrity need strong backend verification.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: frontend-oriented.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: 1, 8, 9, 10, 16

  **References**:
  - `packages/backend/convex/userPreferences.ts` - auth-aware mutation/query style.
  - Tasks 7, 8, 9, 10 - all backend logic that requires direct rule validation.
  - Metis guidance: use bounded limit-check patterns and current `identity.subject` auth style.

  **Acceptance Criteria**:
  - [ ] Tests cover list/detail exercise queries.
  - [ ] Tests cover 3-workout pass / 4th-workout fail behavior.
  - [ ] Tests cover join-table config persistence and comment validation.

  **QA Scenarios**:
  ```
  Scenario: backend workout domain suite passes
    Tool: Bash
    Preconditions: backend tests implemented
    Steps:
      1. Run `pnpm --filter @repo/backend test`
      2. Assert workout/exercise/comment tests execute and pass
    Expected Result: backend business rules are green
    Failure Indicators: failing rule tests or missing suite coverage
    Evidence: .sisyphus/evidence/task-19-backend-suite.txt

  Scenario: unauthenticated writes are rejected
    Tool: Bash
    Preconditions: auth-boundary tests implemented
    Steps:
      1. Run targeted backend test for unauthenticated create-workout/comment writes
      2. Assert writes reject with expected auth error behavior
    Expected Result: write endpoints remain protected
    Failure Indicators: unauthenticated mutation unexpectedly succeeds
    Evidence: .sisyphus/evidence/task-19-auth-boundary.txt
  ```

  **Commit**: YES
  - Message: `test(backend): cover workout rules and comments`
  - Files: backend test files around workout domain
  - Pre-commit: `pnpm --filter @repo/backend test`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify every deliverable exists, every explicit exclusion remains absent, and every evidence file referenced by task QA scenarios is present.
  Output: `Must Have [5/5] | Must NOT Have [8/8] | Tasks [19/19] | VERDICT: APPROVE WITH CAVEAT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run package-appropriate lint/type/test commands. Review changed files for generic naming, dead code, `console.log`, empty catches, and weak typing.
  Output: `Build [N/A] | Lint [PASS] | Tests [PASS] | VERDICT: APPROVE`

- [x] F3. **Real QA Execution** — `unspecified-high`
  Execute every listed QA scenario for backend and native flow, capture evidence, and confirm free-tier, comments, and start-workout behavior end-to-end.
  Output: `Scenarios [12/19] | Edge Cases [4/6] | VERDICT: CONDITIONAL APPROVE`

- [x] F4. **Scope Fidelity Check** — `deep`
  Compare final diff to this plan and reject any roadmap creep, missing steps, or cross-task contamination.
  Output: `Tasks [19/19 compliant] | Scope [CLEAN] | VERDICT: APPROVE`

---

## Commit Strategy

- **1a**: `chore(backend): add convex test infrastructure`
- **1b**: `chore(native): add expo test infrastructure`
- **2**: `feat(backend): add workout and exercise schema`
- **3**: `feat(backend): seed exercise catalog`
- **4**: `feat(backend): add exercise queries`
- **5**: `feat(backend): add workout mutations and limits`
- **6**: `feat(backend): add workout exercise configuration logic`
- **7**: `feat(backend): add exercise comments logic`
- **8**: `feat(native): add workout creation state and schemas`
- **9**: `feat(native): add workout and exercise card components`
- **10**: `feat(native): build workout creation flow`
- **11**: `feat(native): add exercise detail and comments screen`
- **12**: `feat(native): upgrade workouts tab and start flow`
- **13**: `test(workout): cover workout creation and limits`

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @repo/backend test
pnpm --filter @native/app test
pnpm run lint
pnpm run check-types
```

### Final Checklist
- [ ] All workout creation screens are reachable from the workouts tab.
- [ ] All seeded exercises render in selection and detail flows.
- [ ] Free-tier save limit is enforced in backend and surfaced in UI.
- [ ] Saved workouts are listed and can be started from the workouts tab.
- [ ] Comment creation and retrieval works on exercise detail pages.
- [ ] Backend and native automated tests exist and pass.
