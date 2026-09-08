# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-09-08
- Primary product surfaces: Native authentication routes in `apps/native/app/(auth)/`: `welcome.tsx`, `login.tsx`, and `register.tsx`.
- Evidence reviewed:
  - Product language and identity boundaries in `CONTEXT.md`.
  - Repository constraints and native conventions in `CLAUDE.md`.
  - Auth routes and navigation in `apps/native/app/(auth)/_layout.tsx`, `welcome.tsx`, `login.tsx`, and `register.tsx`.
  - Existing native shell and controls in `apps/native/components/native/native-screen.tsx` and `native-text-field.tsx`.
  - Existing appearance/theme implementation in `apps/native/lib/ui/appearance.tsx`, `appearance-state.ts`, `theme.ts`, and platform navigation-theme files.
  - Social-provider availability and state contract in `apps/native/lib/auth/social.ts`, `apps/native/app.config.ts`, and `apps/native/__tests__/social-auth.test.ts`.
  - Email/password validation contract in `apps/native/lib/schemas/auth.ts` and shared email state in `apps/native/lib/auth/store.ts`.
  - Auth/provider wiring in `apps/native/app/_layout.tsx` and `apps/native/package.json`.
  - Profile setup boundary in `apps/native/app/(onboarding)/create-profile.tsx`.
  - Official Clerk native AuthView documentation and screenshots, used only as a visual reference: [AuthView](https://clerk.com/docs/reference/expo/native-components/auth-view), [native components overview](https://clerk.com/docs/reference/expo/native-components/overview), and [native theming](https://clerk.com/docs/reference/expo/native-components/theming).
- No existing root `DESIGN.md` or auth screenshot baseline was present when this contract was created.

## Brand

- Personality: Clear, calm, capable, and native to the device. Authentication should feel like a trustworthy Benchmrk entry point, not a marketing landing page.
- Trust signals: Directly labeled email/password controls, platform-native Apple and Google controls, explicit validation and network feedback, system navigation, and familiar safe-area/keyboard behavior.
- Avoid: Browser-style OAuth or web sign-in language; Clerk branding, Clerk code, Clerk assets, Clerk component names in the product; decorative gradients, arbitrary illustrations, dense card stacks, or provider buttons that cannot complete authentication.

## Product goals

- Goals:
  - Give members three distinct entry routes: welcome, log in, and register, with one shared visual shell.
  - Keep complete email/password forms immediately visible on the log-in and register routes; do not use an identifier-first progressive state.
  - Offer native social sign-in only when the provider is usable on the current platform and configuration.
  - Make authentication outcomes and recovery paths understandable in light and dark appearance modes.
  - Preserve the existing Better Auth + Convex contract and keep Profile setup separate from registration.
- Non-goals:
  - Replacing Better Auth, Convex, or the existing social-auth implementation.
  - Installing Clerk, importing Clerk components, copying Clerk code/assets/branding, or reproducing a proprietary Clerk implementation.
  - Moving profile setup into registration or designing the authenticated app.
  - Adding new authentication methods or product goals not represented in the repository.
- Success signals:
  - A member can identify the current auth route, complete its visible form, and understand the next action without a route-specific visual redesign.
  - Apple appears only on usable iOS builds; Google appears only when the existing configuration permits it on iOS/Android.
  - Screens remain usable with system font scaling, VoiceOver/TalkBack, keyboard open, reduced motion, offline/slow network, and both appearance modes.
  - Screenshots meet the acceptance matrix in `Implementation constraints` without clipped controls, hidden errors, or unreadable text.

## Personas and jobs

- Primary personas: Existing or prospective Benchmrk members entering the app on an iOS or Android phone or tablet. No more specific persona is established in current product documentation.
- User jobs:
  - Decide whether to create a Benchmrk identity, log into an existing identity, or use an available Social sign-in.
  - Enter and submit email/password credentials with confidence.
  - Understand validation, authentication, cancellation, connectivity, and completion feedback.
- Key contexts of use: First launch, returning to the app, device-native provider authentication, portrait and tablet layouts, light/dark system appearance, and a software keyboard covering part of the form.

## Information architecture

- Primary navigation: Expo Router stack navigation supplied by `apps/native/app/(auth)/_layout.tsx`; use platform-native back behavior and transitions. Keep separate `welcome`, `login`, and `register` routes.
- Core routes/screens:
  - `welcome.tsx`: shared brand/entry header, available provider actions, divider, then `Create account` and `Log in` route actions. Its current supporting copy is the exact repository text: “Track training, build consistency, and review your progress.”
  - `login.tsx`: route title/intro, complete email and password form, `Forgot password?` action, primary `Continue with email` action, provider alternatives where usable, and route switch labeled `Create an account`.
  - `register.tsx`: route title/intro, complete email, password, and confirm-password form, primary `Create account` action, provider alternatives where usable, and route switch labeled `Log in instead`.
  - `forgot-password.tsx`: an explicit unavailable-state screen. It says “Password recovery is unavailable,” explains that no recovery request has been sent, labels the state “Coming soon,” and returns with `Back to log in` via `/login`.
  - `verify-2fa.tsx`: an explicit unavailable-state screen. It says “Two-factor verification is unavailable,” explains that no code can be accepted or resent, labels the state “Coming soon,” and returns with `Back to log in` via `/login`. Do not design a code-entry or resend state until the route behavior changes.
  - `apps/native/app/(onboarding)/create-profile.tsx`: separate Profile setup checkpoint after authentication; it is not part of registration UI.
- Content hierarchy: platform navigation/context first; Benchmrk identity/route title; concise supporting copy; provider actions (when available); divider labeled as an alternative; credential fields in logical completion order; primary submit action; recovery/route-switch/legal footer content. On login/register, the form is not hidden behind a first-step identifier screen.

## Design principles

- Principle 1: Native first. Use existing Expo/@expo/ui primitives and official Apple/Google native components, allowing iOS and Android controls, navigation, keyboard behavior, touch feedback, and typography to differ where the platform requires it.
- Principle 2: Shared hierarchy, not identical pixels. Welcome, login, and register use one shell and ordering model, while platform-native controls retain their native appearance and semantics.
- Principle 3: State is content. Loading, validation, provider cancellation/failure, success, disabled, and offline/slow-network states are visible, announced, and actionable.
- Principle 4: Trust through restraint. Keep the surface focused on authentication and use existing Benchmrk theme tokens rather than inventing a second design system.
- Tradeoffs: Native provider controls may not share identical dimensions or typography with email controls; preserving platform authenticity and provider requirements takes precedence. Tablet whitespace may increase to preserve a readable measure. A shared shell must not flatten native navigation or system accessibility behavior.

## Visual language

- Color: Use the existing semantic theme in `apps/native/lib/ui/theme.ts` and platform appearance providers. Light uses a white background, near-black foreground, black primary, subtle gray secondary/muted surfaces, and destructive red; dark inverts foreground/primary appropriately on the near-black background. Provider controls use official component styling rather than recolored imitations. Verify contrast for text, borders, focus, errors, and disabled states in both modes.
- Typography: Use native system typography through `@expo/ui`/React Native. Route title is the strongest text (approximately 28–32pt, semibold/bold consistent with existing `welcome.tsx` and route forms); supporting copy is body-sized (approximately 16–17pt); labels are semibold body-sized; helper/error text is at least 14pt and remains readable under Dynamic Type. Exact system font, weight, and scaling stay platform-native.
- Spacing/layout rhythm: Use an 8pt base rhythm. Safe-area content starts at 24pt horizontal inset on phones, with 16pt minimum vertical separation between major groups and 8pt between label/control and helper/error text. Maintain at least 24pt between header and first action group. On tablets, center a readable content column while retaining 24–32pt outer insets; do not stretch fields across the full tablet width.
- Max width: Cap the auth content column at 420pt on tablets and landscape; phone layouts use available width minus safe-area insets. Provider and primary controls fill the column. Do not create a floating desktop card unless platform conventions require one.
- Shape/radius/elevation: Follow existing `THEME.*.radius` (10pt equivalent) and native component corner treatment. Prefer flat surfaces and semantic borders; no ornamental elevation. Keep the divider visually quiet and aligned to the same content column.
- Imagery/iconography: No decorative imagery is required, and the native app currently has no confirmed Benchmrk auth logo asset: `apps/native/app.json` points to the configured Expo icon/splash assets under `apps/native/assets/images/`, while the canonical Benchmrk SVG marks live only in `apps/website/public/logo.svg` and `logo-dark.svg`. Do not invent or copy a new native mark for this flow; use the existing textual product name only if a brand cue is needed. Use official Apple/Google provider visuals supplied by their components, not hand-drawn logos.

## Components

- Existing components to reuse:
  - `NativeScreen` for safe native host, scroll behavior, appearance, and baseline 24pt padding.
  - `NativeTextField` / `@expo/ui` `TextInput`, `Column`, `Text`, `Button`, and `ListItem` patterns.
  - `@react-native-google-signin/google-signin` `GoogleSigninButton` and `expo-apple-authentication` `AppleAuthenticationButton`.
  - `useAppearance`, `THEME`, navigation themes, `showToast`, auth client/store, and existing validation hooks/schemas.
- New/changed components: One shared auth visual shell/layout composition consumed by welcome, login, and register; route-specific form content and state messaging; an availability-aware provider group; and a semantic divider. Prefer existing files/components or a small native auth component under `apps/native/components/native/` over a new styling layer.
- Control ordering:
  - Welcome: brand/route heading → supporting copy → usable Apple (iOS only) → usable Google → divider with `or` → `Create account` primary → `Log in` secondary/outlined → legal/footer copy.
  - Login: heading → supporting copy → email → password → `Forgot password?` → primary `Continue with email` → provider group/divider as an alternative → route switch `Create an account` → legal/footer copy.
  - Register: heading → supporting copy → email → password → confirm password → primary `Create account` → provider group/divider as an alternative → route switch `Log in instead` → legal/footer copy.
  - The final implementation must keep labels, errors, and submit controls associated in accessibility order. Providers remain below the credential submit action on login/register; the complete form is always visible.
- Divider: A full-column hairline using the theme border color with centered, muted `or` text; at least 16pt clear space above and below. It separates credential actions from provider alternatives and is not itself interactive.
- Legal/footer content: The shared auth shell ends with a secondary, non-interactive footer after the route switch. On welcome, login, and register it displays the exact factual copy `Terms of Service and Privacy Policy coming soon.` as plain text with no links and no consent implication. Do not say `By continuing, you agree` (or equivalent) until finalized documents exist. Omit any `Secured by Benchmrk` badge. Replacing this placeholder copy is tracked by issue #100. The footer remains reachable after the form, uses muted readable styling, and wraps without truncation in Dynamic Type and dark mode.
- Variants and states: welcome/login/register; light/dark; iOS/Android; phone/tablet; available/unavailable provider; idle/focused/filled/invalid/disabled; submitting; provider loading; provider cancelled; provider failure; server failure; offline/slow network; successful authentication pending navigation; keyboard open; reduced motion; VoiceOver/TalkBack and Dynamic Type.
- Token/component ownership: Semantic colors and radius come from `apps/native/lib/ui/theme.ts` and platform navigation themes. Appearance resolution comes from `apps/native/lib/ui/appearance.tsx` / `appearance-state.ts`. Platform provider components own provider visual rules. The shared shell owns layout spacing and hierarchy; routes own copy, validation, and auth actions.

## Accessibility

- Target standard: WCAG 2.2 AA intent for contrast, labels, focus/activation, and error communication, plus iOS Human Interface Guidelines and Android accessibility conventions. Native platform semantics take precedence where they provide stronger behavior.
- Keyboard/focus behavior: Every field and action is reachable in logical reading order. Focus advances email → password → confirm password → submit (with provider/recovery/route links placed intentionally in the accessible order). The form scrolls/pans above the keyboard, never hides the submit action, and dismisses the keyboard only when it does not interrupt correction. Back navigation preserves native platform behavior.
- Contrast/readability: Do not rely on color alone for errors, loading, disabled, or success. Keep errors adjacent to the relevant field and provide a summary/status message when needed. Maintain readable line lengths and support Dynamic Type without clipping or truncation.
- Screen-reader semantics: Labels are programmatically associated with fields; secure fields expose secure entry; provider buttons announce provider and action; busy status announces loading and prevents duplicate submission; errors and success use live/status semantics appropriate to the platform; unavailable providers are omitted rather than exposed as dead controls.
- Reduced motion and sensory considerations: Respect system reduced-motion preferences, avoid flashing, keep touch targets at least 44pt iOS / 48dp Android where the platform guidance calls for it, and preserve visible focus/pressed states.

## Responsive behavior

- Supported breakpoints/devices: iOS and Android phones and tablets, portrait and landscape where supported by the app. Test at least a narrow phone, a large phone, and a tablet in each platform and appearance mode.
- Layout adaptations: Phone content is a single scrollable column. Tablet content is a centered column capped at 420pt with balanced outer whitespace. Landscape keeps the same max width and scrolls when vertical space is constrained. Long Dynamic Type settings increase height naturally; never shrink text to fit.
- Touch/hover differences: Use native press/ripple/highlight feedback and platform hit slop. Hover is optional and secondary on devices that support it; it must not replace pressed/focused feedback.

## Interaction states

- Loading: While social config is unresolved, do not present misleading provider actions; show a non-blocking loading state in the provider region. During submission, keep the route visible, disable duplicate submits, retain entered values, and announce the active operation.
- Empty: Empty form fields are valid initial state with clear labels and no premature error noise. Missing provider configuration means the provider control is absent, not an empty placeholder.
- Error: Inline field errors follow `apps/native/lib/schemas/auth.ts` messages/constraints where applicable. Form/server errors are explicit, adjacent to the action or in an announced status region, and provide a retry/correction path. Provider cancellation is not presented as a server failure; provider failure uses the existing `runSocialAuth` result/message contract.
- Success: On successful authentication, communicate completion and transition to the existing auth/onboarding flow. Profile setup remains separate and must not be visually implied to be part of registration.
- Disabled: Disabled controls retain readable labels and sufficient contrast. Disable only the controls affected by the active request, while preventing duplicate authentication attempts.
- Offline/slow network, if applicable: Show an explicit connection/request state, preserve entered data, allow retry when safe, and never imply success before Better Auth/Convex confirms it. Native provider availability still controls whether provider actions are shown.

## Content voice

- Tone: Direct, calm, concise, and reassuring without marketing claims.
- Terminology: Follow `CONTEXT.md`: use “Benchmrk identity,” “Provider identity,” “Social sign-in,” and “Profile setup” where domain language is needed. Do not call a Benchmrk identity an “account” or a provider identity a “social account.” Route actions use familiar user-facing labels such as “Log in” and “Create account” because those are already present in the routes.
- Microcopy rules: Say what happened and what the member can do next. Keep labels sentence case. Avoid implementation terms, browser/OAuth wording, unexplained provider configuration details, and promises not supported by current product docs. Preserve existing validation wording unless implementation evidence requires a correction.

## Implementation constraints

- Framework/styling system: Expo Router and React Native in `apps/native`; use existing `@expo/ui` native primitives, NativeWind/UI components where already appropriate, and platform-native Apple/Google components. Do not install Clerk or change Better Auth + Convex.
- Design-token constraints: Extend `apps/native/lib/ui/theme.ts` and existing appearance/navigation tokens rather than creating parallel colors or radii. Provider brand styling remains owned by official provider components.
- Performance constraints: Avoid unnecessary auth/provider probes and re-renders; do not block rendering the complete email/password forms on provider configuration. Keep native scroll/keyboard behavior responsive.
- Compatibility constraints: Apple Social sign-in is iOS only and must use the existing `isAppleAvailable` contract. Google is configured for iOS/Android through existing `isGoogleAvailable`, `app.config.ts`, and environment configuration. Show actions only when they can complete. Keep Better Auth, Convex, existing route names, profile setup boundary, and platform navigation intact.
- Test/screenshot expectations:
  - Capture welcome, login, and register on iOS and Android at phone and tablet sizes in light and dark modes: 3 routes × 2 platforms × 2 device classes × 2 appearances = 24 baseline screenshots (or an explicitly documented platform limitation).
  - Capture focused/keyboard-open and Dynamic Type/reflow variants for login and register; capture provider-present and provider-absent variants, including Apple absent on Android and Google absent when configuration is missing.
  - Capture loading, validation error, provider cancellation/failure, server/offline error, disabled submit, and success/pending-navigation states. Screenshots must show no clipping, overlap, unreadable contrast, hidden errors, or controls below an inaccessible keyboard.
  - Compare hierarchy, spacing, native control treatment, safe areas, navigation/back behavior, and accessibility labels against this contract. The Clerk AuthView screenshots are a composition/hierarchy reference only, never a pixel-copy target or dependency.

## Open questions

- None currently.
