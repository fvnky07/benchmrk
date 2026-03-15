# Active Workout — Issues & Gotchas

## [2026-03-15T00:44:46Z] Session Start

### Known Gotchas
- `workoutExercises.ts` may be in `workouts.ts` — check before creating `sessionExercises.ts`
- `components/workout/index.ts` barrel may or may not exist — create if missing
- PortalHost location in root _layout.tsx: line ~72 — verify before Task 10
- `@expo/ui BottomSheet` on Android will crash — MUST platform-guard
- `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs` for mini-player offset (v7.4.0 installed)
- `@shopify/flash-list` 2.0.2 is installed but must be wrapped in a fixed-height container or `flex: 1` parent
