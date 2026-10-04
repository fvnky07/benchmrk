# Lib Directory Structure

Organized utility functions, hooks, and configurations for the native app.

## Directory Organization

```
lib/
├── auth/              # Authentication utilities
│   ├── client.ts      # Better Auth client configuration
│   ├── hooks.ts       # useAuth hook
│   └── store.ts       # Auth state management
│
├── analytics/         # Analytics & tracking
│   └── posthog.ts     # PostHog configuration and helpers
│
├── ui/                # UI-related utilities
│   ├── theme.ts       # Theme configuration
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

### Import from category

```ts
import { authClient, useAuth } from '@/lib/auth';
import { analytics, identifyUser } from '@/lib/analytics';
import { showToast, NAV_THEME } from '@/lib/ui';
```

### Import from main index

```ts
import { authClient, analytics, showToast } from '@/lib';
```

## Guidelines

- **auth/**: Authentication, sessions, and user management
- **analytics/**: Event tracking and user analytics
- **ui/**: UI configuration, themes, toasts
- **workout/**: Workout formatting, labels and hooks
- **hooks/**: Reusable React hooks
- **schemas/**: Zod or validation schemas

Each category exports an `index.ts` for clean imports.
