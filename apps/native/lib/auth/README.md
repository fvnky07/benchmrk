# Auth Architecture

Clean authentication setup with a single source of truth for session state.

## Architecture Principle

**Single Subscription Rule**: `authClient.useSession()` is called in ONE place only - inside `useAuth()`.

All other hooks and components must consume `useAuth()` to avoid duplicate subscriptions and ensure consistent state.

## Core Hook: `useAuth()`

**Location**: `lib/auth/hooks.ts`

The single source of truth for authentication state.

```tsx
const { user, isAuthenticated, isLoading } = useAuth();

// user: User | undefined - The authenticated user object
// isAuthenticated: boolean - Whether user is logged in
// isLoading: boolean - Whether session is loading
```

### Usage Examples

```tsx
// In components
function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Login />;

  return <div>Welcome {user.name}</div>;
}

// In other hooks
function useUserProfile() {
  const { user, isLoading } = useAuth(); // ✅ Correct
  // NOT: const session = authClient.useSession(); // ❌ Wrong
  
  // ... process user data
}
```

## Derived Hook: `useUserProfile()`

**Location**: `lib/hooks/use-user-profile.ts`

Consumes `useAuth()` and provides formatted user profile data.

```tsx
const { username, bio, avatarUrl, initials, isLoading } = useUserProfile();
```

**Architecture**:
- ✅ Calls `useAuth()` internally
- ✅ No duplicate session subscriptions
- ✅ Provides safe fallbacks for display fields

## Components Using Auth

### RootLayout (`app/_layout.tsx`)

```tsx
// ✅ Correct: Uses useAuth()
const { user, isAuthenticated, isLoading } = useAuth();

useEffect(() => {
  if (isAuthenticated && user) {
    identifyUser(user.id, { email: user.email ?? '' });
  }
}, [isAuthenticated, user]);
```

### Profile Screens

```tsx
// ✅ Use useUserProfile() which internally uses useAuth()
const { username, avatarUrl, initials } = useUserProfile();
```

## Shared sign-in lock

- The email form and native provider buttons share one pending lock.
- Successful social sign-in keeps the lock held while navigation leaves the
  auth route. The route's cleanup releases it; cancellation, provider failure
  and unexpected errors release it immediately so another method can retry.

## Enumeration-safe email requests

- Public password-reset requests acknowledge identically for eligible,
  ineligible and undeliverable addresses. Eligibility and email delivery run in
  a scheduled Convex action, with at most one delayed retry.
- Native waitlist sign-in requests use the same scheduled delivery policy;
  only confirmed Waitlist identities receive a link. Delivery failures never
  alter the public acknowledgement.
  The cooldown, Better Auth token and delivery job commit in one mutation.
  Failed delivery releases the matching token reservation before retrying.
- Delivery logs omit the email address. Signed-in verification resends can
  still return `EMAIL_DELIVERY_FAILED` so members can retry.
- Website deletion confirmations atomically reserve their token and cooldown
  before sending. Failed delivery releases only the matching reservation, so
  an immediate retry can issue a valid link.

## Notification lifecycle

- Profile setup ends with the skippable **Get Group invites and rest timers**
  screen. The native permission prompt appears only after **Allow**. A
  device-local checkpoint keeps that step reachable after saving the username,
  including if the app closes before the choice.
- `(main)/_layout.tsx` mounts `usePushRegistration`: granted permission registers
  the current Expo token on sign-in and every app start, and refreshes it when
  the app returns from Settings or the native token changes. It never prompts.
- The ordinary sign-out path awaits `unregisterThisDevice` with
  `api.deviceTokens.unregister` before calling `authClient.signOut`. It removes
  only that device's token while the Benchmrk identity is still authenticated.
- `usePushPermissionReoffer` supplies the Group screen's first-open/create
  offer. It uses the same explanation, persists one re-offer per device, and
  leaves a previously granted or refused OS choice alone.
- Tapping a Group invite opens `/workout/group`; its inbox is the source of
  truth, including **This Group has ended**. Invite delivery uses Expo's HTTP
  API from Convex, without retries, and checks delivery receipts after 15
  minutes to remove invalid device tokens.
- Real push delivery requires an EAS development build with APNs and FCM
  credentials. Permission flow, notification taps, VoiceOver/TalkBack and
  delivery on physical iOS and Android devices remain hardware checks.

## Rules

### ✅ DO

```tsx
// Use useAuth() for auth state
const { user, isAuthenticated } = useAuth();

// Use useUserProfile() for profile data
const { username, bio, avatarUrl } = useUserProfile();

// Import types from the module that owns them
import type { User, UseAuthReturn } from '@/lib/auth/hooks';
```

### ❌ DON'T

```tsx
// Never call useSession() directly in components
const session = authClient.useSession(); // ❌ Wrong

// Never call useSession() in custom hooks
function useMyHook() {
  const session = authClient.useSession(); // ❌ Wrong
}
```

## Benefits

1. **Single Source of Truth**: All auth state comes from one place
2. **No Duplicate Subscriptions**: Only one session listener active
3. **Consistent State**: All components see the same auth state
4. **Type Safety**: Centralized User type definition
5. **Easy Testing**: Mock `useAuth()` instead of Better Auth internals
6. **Clean Architecture**: Clear separation of concerns

## File Structure

```
lib/auth/
├── client.ts       # Better Auth client configuration
├── hooks.ts        # useAuth() - THE ONLY place calling useSession()
├── store.ts        # Zustand store for auth state
└── README.md       # This file
```

## Migration Guide

If you find code calling `authClient.useSession()` directly:

```tsx
// Before ❌
const session = authClient.useSession();
const user = session.data?.user;
const isLoading = session.isPending;

// After ✅
const { user, isAuthenticated, isLoading } = useAuth();
```

## Type Definitions

```typescript
export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  [key: string]: unknown; // For custom fields like displayUsername, bio
}

export interface UseAuthReturn {
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```
