# Prefer native UI with narrow NativeWind fallbacks

Benchmrk mobile routes use thin semantic components backed by `@expo/ui` SwiftUI and Jetpack Compose controls wherever the installed Expo SDK provides a suitable contract. When a required control or behavior has a confirmed platform gap, the semantic component may use a narrow NativeWind fallback rather than adding custom Swift or Kotlin solely for parity; shared route, state, and domain behavior remains in TypeScript, and web uses an accessible React Native Web adapter. This preserves a native-consistent product experience without committing the team to permanent duplicate platform implementations.

## Amendment — 2026-10-02

Since #168, NativeWind and NativeWind fallbacks are no longer allowed. Mobile routes use `@expo/ui` native-first components and system components; confirmed platform gaps use narrow native extensions instead. The original decision above is retained as historical context.
