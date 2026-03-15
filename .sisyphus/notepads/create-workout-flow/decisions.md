# Decisions — create-workout-flow

## [2026-03-14] Session ses_31400c66dffeI2g0LNmXFO6wjI — Plan setup

### Architecture Decisions

**Schema Tables**
- `exercises`: slug (indexed), name, description, imageUrl, category, muscleGroups, instructions
- `workouts`: userId (indexed), name, createdAt — 3 per free user max
- `workoutExercises`: workoutId (indexed), exerciseId (indexed), order, sets, reps, weight — junction table
- `exerciseComments`: exerciseId (indexed), userId, body, createdAt — basic create/list

**Free-Tier Rule**
- Backend hard-enforces: `.take(4)` check — if length >= 4, throw ConvexError
- UI soft-enforces: Check workout count before revealing create flow OR show error on submission

**Exercise Seeding**
- `packages/backend/convex/init.ts` with `internalMutation` 
- Run via `convex dev --run init` or equivalent
- Covers ~10-15 exercises across major movement patterns

**Native Flow Steps**
1. `workout/index.tsx` — Workouts tab (saved list + create CTA)
2. `workout/create/index.tsx` — Step 1: Name + exercise selection
3. `workout/exercise/[slug].tsx` — Exercise detail + comments (modal/push from creation OR tab)
4. `workout/create/configure.tsx` — Step 2: Sets/reps/weight per exercise
5. `workout/create/review.tsx` — Step 3: Review + save
6. `workout/[id]/start.tsx` — Start saved workout

**Navigation header CTA**
- Continue from name/select → header right button `Continue` → configure step
- Continue from configure → header right button `Review` → review step
- Save from review → header right button `Save` with loading state

**State Reset on Exit**
- Zustand `useWorkoutStore` has `reset()` action
- Call `reset()` in `useEffect` cleanup or on navigation exit via `useFocusEffect`
- No local storage / AsyncStorage for draft
