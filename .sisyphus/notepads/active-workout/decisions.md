# Active Workout — Decisions

## [2026-03-15T00:44:46Z] Architecture Decisions

### Mini-player: Portal instead of NativeTabs.BottomAccessory
**Decision**: Use `@rn-primitives/portal` (already installed) for floating mini-player
**Rationale**: `NativeTabs.BottomAccessory` is SDK 55+ only, not in SDK 54 package
**Implementation**: `<Portal name="workout-mini-player">` with absolute positioning above tab bar

### Exercise Picker: @expo/ui/swift-ui BottomSheet
**Decision**: Use `@expo/ui/swift-ui` BottomSheet for iOS, React Native Modal fallback for Android
**Rationale**: Already installed (v0.2.0-beta.9), native feel, no new dependencies
**CRITICAL API**: `isOpened`/`onIsOpenedChange` (installed version) NOT `isPresented`

### Timer: Date.now() delta approach
**Decision**: Store `startedAt: Date.now()` on session creation, compute elapsed as `Date.now() - startedAt`
**Rationale**: Survives app backgrounding, app kills (with AsyncStorage persist), no drift
**AppState**: Clear setInterval on background, restart + reconcile on active

### Set table: named sessionSets
**Decision**: New sets table named `sessionSets` not `sets`
**Rationale**: `workoutExercises.sets` is a number field — naming collision with a table named `sets`

### exerciseType: v.optional()
**Decision**: Add as optional to exercises schema
**Rationale**: Existing seeded exercises don't have this field; v.optional() = backward compat

### Concurrent sessions: block with Alert
**Decision**: `startSession` mutation throws `ConvexError('ACTIVE_SESSION_EXISTS')` if session exists
**Rationale**: Simple, prevents data corruption, shows user clear message

### AsyncStorage: install in Task 5
**Decision**: `expo install @react-native-async-storage/async-storage`
**Rationale**: Zustand persist requires it; not currently in project
