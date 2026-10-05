# Lib Directory Structure

Organized utility functions, hooks, and configurations for the native app.

## Directory Organization

```
lib/
├── auth/              # Authentication utilities
│   ├── client.ts      # Better Auth client configuration
│   ├── hooks.ts       # useAuth hook
│   ├── social.ts      # Social sign-in and Account linking
│   ├── error-copy.ts  # Copy for backend auth error codes
│   └── store.ts       # Auth form state and the shared pending lock
│
├── analytics/         # Analytics & tracking
│   └── posthog.ts     # PostHog configuration and helpers
│
├── ui/                # UI-related utilities
│   ├── colors.ts      # useColors(): Material 3 colour roles (Material You on Android, system colours on iOS)
│   ├── toast.ts       # Toast notification helpers
│   └── toast-config.tsx # Toast UI configuration
│
├── workout/           # Workout formatting, labels and hooks
│
├── hooks/             # Custom React hooks
│   └── use-form-validation.ts
└── schemas/           # Validation schemas
    └── auth.ts        # Auth-related schemas
```

## Usage

### Import from the owning module

```ts
import { authClient } from '@/lib/auth/client';
import { useAuth } from '@/lib/auth/hooks';
import { analytics, identifyUser } from '@/lib/analytics';
import { showToast, useColors } from '@/lib/ui';
```

Auth and analytics have no barrel; import from the file that owns the helper.

## Guidelines

- **auth/**: Authentication, sessions, and user management
- **analytics/**: Event tracking and user analytics
- **ui/**: UI configuration, colours (`useColors`), toasts
- **workout/**: Workout formatting, labels and hooks
- **hooks/**: Reusable React hooks
- **schemas/**: Zod or validation schemas

Import from the module that defines the helper rather than a re-export.
