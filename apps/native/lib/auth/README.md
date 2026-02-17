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

## Rules

### ✅ DO

```tsx
// Use useAuth() for auth state
const { user, isAuthenticated } = useAuth();

// Use useUserProfile() for profile data
const { username, bio, avatarUrl } = useUserProfile();

// Export types from auth module
import type { User, UseAuthReturn } from '@/lib/auth';
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
├── index.ts        # Public exports
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
