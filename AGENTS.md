# AGENTS.md - Repository Guidelines for Agentic Coding

This document provides guidelines for AI agents operating in the benchmrk Turborepo monorepo.

## Repository Structure

```
apps/
├── mobile/      (@mobile/app) - Expo + React Native with Convex integration
└── website/     (website) - Next.js 16 with TypeScript

packages/
├── backend/     (@repo/backend) - Convex backend
├── eslint-config/ - Shared ESLint configurations
├── typescript-config/ - Shared TypeScript configurations
└── ui/          - Shared React component library
```

## Build, Lint, and Test Commands

### Build Commands

```bash
# Build all apps
pnpm run build:all

# Build specific app
pnpm run build:web              # Next.js website
pnpm run build:mobile           # Expo mobile app

# Platform-specific mobile builds
pnpm run build:ios              # iOS
pnpm run build:android          # Android
```

### Type Checking

```bash
# Type-check all packages
pnpm run check-types

# Type-check specific package
pnpm turbo run check-types --filter=website
pnpm turbo run check-types --filter=@mobile/app
```

### Linting

```bash
# Lint all packages
pnpm run lint

# Lint specific app
pnpm turbo run lint --filter=website
pnpm turbo run lint --filter=@mobile/app
```

### Code Formatting

```bash
# Format all code
pnpm run format

# Format specific file types
prettier --write "apps/website/**/*.{ts,tsx}"
```

## Code Style Guidelines

### Imports & Organization

- **Order**: External dependencies → Relative imports (parent to child)
- **Structure**: Group by type (React, utilities, types, components)
- **Path aliases**: Use `@/*` in Next.js; `@repo/*` for monorepo packages
- **Avoid**: Circular dependencies; use workspace: protocol in package.json

Example:

```typescript
import type { Metadata } from 'next';
import { Button } from '@repo/ui';
import { helper } from '../utils';
```

### TypeScript & Typing

- **Strict mode**: Enabled globally (`strict: true` in tsconfig.json)
- **No implicit any**: Use explicit types for functions and variables
- **Interfaces over types**: Use `interface` for object shapes, `type` for unions/primitives
- **Readonly props**: Mark component props with `Readonly<>`
- **React.FC not needed**: Use direct function declarations with return type

Example:

```typescript
interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Button = ({ children, className, onClick }: ButtonProps) => {
  return <button className={className} onClick={onClick}>{children}</button>;
};
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `CardLayout`, `UserProfile`)
- **Functions/variables**: camelCase (e.g., `handleClick`, `getUserData`, `isValid`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Files**: Use component name in PascalCase for React files
- **Exports**: Prefer named exports; use `export const Component = ...`

### Formatting Rules (Prettier)

- **Line length**: 80 characters (default)
- **Tabs**: 2 spaces
- **Quotes**: Double quotes in JSX, single in JS
- **Semicolons**: Always included
- **Trailing commas**: ES5 (multiline objects/arrays only)

Run `pnpm run format` before committing.

### React & Next.js Conventions

- **Server/Client components**: Use `"use client"` at top of file for client components
- **Props destructuring**: Always destructure in function signature
- **Default exports**: Use for app pages only; use named exports elsewhere
- **Hooks**: Call only at component top level; follow rules-of-hooks

Example:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@repo/ui";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export const Card = ({ title, children }: CardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <h2>{title}</h2>
      {isOpen && <div>{children}</div>}
    </div>
  );
};
```

### Error Handling

- **Try/catch**: Use for async operations; provide meaningful error messages
- **Error types**: Use `Error` base class or create domain-specific error classes
- **Logging**: Use `console.error()` for errors, avoid silent failures
- **Type guards**: Check for undefined/null before accessing properties

Example:

```typescript
export async function fetchData(id: string) {
  try {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}
```

### Comments & Documentation

- **Use sparingly**: Code should be self-documenting
- **JSDoc for exported functions**: Document parameters and return types
- **TODO/HACK/FIXME**: Use inline comments with context
- **Complex logic**: Add comments explaining why, not what

Example:

```typescript
/**
 * Validates user input before submission.
 * @param input - The user input string
 * @returns true if valid, false otherwise
 */
function validateInput(input: string): boolean {
  // NOTE: Email validation is intentionally lenient to match backend rules
  return input.length > 0 && input.includes('@');
}
```

## Monorepo Conventions

### Workspace Dependencies

- **Reference format**: `@repo/package-name` for packages, app names for apps
- **Version spec**: Use `workspace:*` in package.json
- **Installation**: `pnpm install` (respects workspace links)

Example package.json:

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/backend": "workspace:*"
  }
}
```

### Creating New Packages

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with name, scripts, and dependencies
3. Update `turbo.json` if adding new task types
4. Run `pnpm install` to link workspace packages

### Turbo Task Configuration

- **dev tasks**: Set `persistent: true`, `cache: false`
- **build tasks**: Set outputs, inputs, and `dependsOn: ["^build"]`
- **Other tasks**: Configure based on cachability and dependencies

## ESLint & TypeScript Configuration

### Active Plugins

- **ESLint**: Base config with TypeScript support
- **Next.js**: Core Web Vitals and recommended rules
- **React Hooks**: Enforces rules-of-hooks
- **Turbo**: Warns on undeclared env vars
- **Prettier**: Integration to avoid conflicts

### Enforced Rules

- No unused variables
- No implicit any types
- React hooks dependency arrays validated
- Next.js Image and Link components enforced
- No undeclared environment variables

## Commit Message Format

Follow conventional commits:

```
<type>: <description>

[optional body explaining why]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:

```
feat: add mobile push notification support

Integrates Firebase Cloud Messaging for push notifications.
Updates @mobile/app to listen for and display notifications.
```

## Testing & Verification Checklist

Before committing:

- [ ] Run `pnpm run check-types` - all packages pass
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Run `pnpm run format` - code formatted consistently
- [ ] Test changes locally: `pnpm run dev:all` or specific dev server
- [ ] Verify new packages in `turbo.json` if created
- [ ] Update workspace dependencies if needed

## Performance & Optimization

### Caching & Builds

- **Turbo caching**: Respects file inputs and outputs; don't modify cache
- **Parallel execution**: Use `--parallel` flag for independent tasks
- **Filter tasks**: Use `--filter` to run only affected packages

### Code Splitting

- **Next.js**: Automatic route-based code splitting
- **React components**: Export large component libraries from root index
- **Dynamic imports**: Use `React.lazy()` for route-based splitting

## Troubleshooting

### Common Issues

- **Port conflicts**: `pnpm dev:all` fails on port already in use → Kill process: `lsof -i :3000`
- **Missing deps**: Workspace packages not found → Run `pnpm install`
- **Type errors**: TS3000+ errors → Check tsconfig.json extends and strictness

## References

- [Turborepo Docs](https://turborepo.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [ESLint](https://eslint.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prettier](https://prettier.io/)
