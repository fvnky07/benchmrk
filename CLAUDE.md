# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Benchmrk is a fitness tracking platform built as a Turborepo monorepo with:

- **Website**: Next.js 16 landing page and web app
- **Native**: Expo/React Native mobile app
- **Backend**: Convex real-time database and serverless functions
- **Shared packages**: UI components, ESLint/TypeScript configs

## Essential Commands

### Development

```bash
pnpm run dev              # Run all apps in parallel (website + native + backend)
pnpm run dev:web          # Website only (http://localhost:3000)
turbo run dev --filter=@native/app  # Native only (Expo)
cd packages/backend && pnpm run dev # Backend only (Convex)
```

### Type Checking & Linting

```bash
pnpm run check-types      # Type-check all packages (run before committing)
pnpm run lint             # Lint all packages
pnpm run format           # Format with Prettier (80 char width)

# Per-package
turbo run check-types --filter=website
turbo run lint --filter=@native/app
```

### Building

```bash
pnpm run build:web        # Build website (Next.js)
pnpm run build:ios        # Build iOS app
pnpm run build:android    # Build Android app
```

### Mobile Development

```bash
cd apps/native
expo start                # Start Expo dev server
expo run:ios              # Run on iOS simulator
expo run:android          # Run on Android emulator
expo prebuild --clean     # Regenerate native projects
```

### Backend (Convex)

```bash
cd packages/backend
pnpm run dev              # Start Convex dev server with hot reload
pnpm run deploy           # Deploy to production
```

## Architecture

### Monorepo Structure

- **Turborepo** orchestrates parallel builds and caching
- **pnpm workspaces** manage dependencies with `workspace:*` protocol
- Shared configs in `packages/` for ESLint, TypeScript
- Each app/package has its own `package.json` and can be filtered with `--filter=<name>`

### Path Aliases

- **Website**: `@/*` → `apps/website/`
- **Native**: `@/*` → `apps/native/`
- **Backend access**: `@repo/backend/*` → `packages/backend/*`
- These are configured per-package in `tsconfig.json` paths

### Key Dependencies

**Website (apps/website)**:

- Next.js 16 with App Router (file-based routing in `app/`)
- React 19.2 (latest stable)
- Tailwind CSS 4 (configured via `@tailwindcss/postcss`)
- Radix UI primitives (Accordion, Navigation Menu, Popover)
- Better Auth for authentication (`@convex-dev/better-auth`)
- Convex client for real-time data
- Fumadocs for MDX content (blog, changelog)

**Native (apps/native)**:

- Expo ~54 with Expo Router 6 (file-based routing in `app/`)
- React Native 0.81
- React 19.1 (slightly older than website)
- NativeWind 4 for Tailwind-style styling on React Native
- React Navigation 7 (bottom tabs, native stack)
- Reanimated 4 for animations
- rn-primitives for accessible UI components (Portal, Separator, Slot)

**Backend (packages/backend)**:

- Convex for database, auth, and server functions
- Better Auth integration
- Schema defined in `convex/schema.ts`

### Styling

**Website**:

- Tailwind CSS 4 (latest CSS-based architecture)
- Uses `@tailwindcss/postcss` in PostCSS config
- 80-character line width for class strings
- Component library based on shadcn/ui patterns in `components/ui/`

**Native**:

- NativeWind 4 (Tailwind classes compiled to React Native styles)
- Uses `nativewind` with `tailwindcss` v3 (not v4)
- Styling via `className` prop (transformed to React Native styles)
- Custom UI primitives in `components/ui/` for accessible components

### Authentication

**Better Auth** is used across both platforms:

- Backend: `packages/backend/convex/betterAuth/` contains auth config
- Website: `@convex-dev/better-auth` client integration
- Native: Uses same backend auth but may need platform-specific flows

### Routing

**Website** (Next.js App Router):

- File-based routing in `apps/website/app/`
- Route groups: `(landing)`, `(auth)`, etc.
- Server/client components via `"use client"` directive
- Layouts in `layout.tsx`, pages in `page.tsx`

**Native** (Expo Router):

- File-based routing in `apps/native/app/`
- Route groups: `(auth)`, `(main)`, etc.
- Root layout in `_layout.tsx`
- Expo Router handles navigation stack automatically

### Database & Backend

**Convex** (`packages/backend/convex/`):

- Real-time reactive queries and mutations
- Schema in `schema.ts` (currently has `waitlist` table)
- Server functions are modules that export functions with `query`, `mutation`, `action`
- Auto-generated types in `_generated/`
- Auth handled via Better Auth integration in `betterAuth/` and `auth.ts`

To add new functionality:

1. Define schema in `schema.ts`
2. Create query/mutation files in `convex/`
3. Import and use in frontend via Convex client

### TypeScript Configuration

- **Strict mode enabled** across all packages
- **No implicit any**: Always type function parameters and return values
- **React 19**: Some breaking changes from React 18 (children no longer implicit in props)
- Website extends Next.js TypeScript plugin for App Router types
- Native extends `expo/tsconfig.base`

## Code Conventions

### Imports

Organize in this order:

1. External dependencies (React, Next.js, etc.)
2. Internal workspace packages (`@repo/*`)
3. Relative imports (parent → child directories)

### Components

- Use function declarations with typed props (not `React.FC`)
- Destructure props in function signature
- Server components by default in Next.js (add `"use client"` when needed)
- Named exports preferred (except for Next.js pages which use default export)

### Naming

- **Components**: PascalCase (`Button`, `UserProfile`)
- **Functions/variables**: camelCase (`handleClick`, `getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: Match component name for React files

### Formatting (Prettier)

- 80 character line width
- 2 spaces for indentation
- Single quotes in JS, double quotes in JSX
- Always use semicolons
- Tailwind classes auto-sorted by `prettier-plugin-tailwindcss`

Run `pnpm run format` before committing.

### Error Handling

- Use try/catch for async operations
- Provide meaningful error messages
- Avoid silent failures (log with `console.error`)
- Check for null/undefined before accessing properties

### Comments

- Code should be self-documenting; use comments sparingly
- Use JSDoc for exported functions with complex parameters
- Explain "why" not "what" for complex logic
- Use TODO/FIXME/HACK tags with context when needed

## Common Patterns

### Adding a New UI Component (Website)

1. Create in `apps/website/components/ui/` (or `components/` for complex features)
2. Use Radix UI primitives when possible for accessibility
3. Style with Tailwind classes
4. Export as named export
5. Import with `@/components/ui/...`

### Adding a New UI Component (Native)

1. Create in `apps/native/components/ui/`
2. Use rn-primitives for accessible patterns
3. Style with NativeWind className prop
4. Test on both iOS and Android
5. Import with `@/components/ui/...`

### Adding a New Page (Website)

1. Create folder in `apps/website/app/` (or use route groups)
2. Add `page.tsx` for the page component
3. Optionally add `layout.tsx` for shared layout
4. Use async Server Components for data fetching when possible
5. Add `"use client"` only if you need interactivity

### Adding a New Screen (Native)

1. Create file in `apps/native/app/` (use route groups like `(main)/`)
2. Expo Router automatically creates routes from file structure
3. Use `_layout.tsx` to configure navigation options
4. Import navigation hooks from `expo-router`

### Adding Backend Functionality

1. Update `packages/backend/convex/schema.ts` if adding tables
2. Create query/mutation file (e.g., `users.ts`) in `convex/`
3. Export functions with `query()`, `mutation()`, or `action()`
4. Import in frontend: `import { api } from '@repo/backend/convex/_generated/api'`
5. Use Convex React hooks: `useQuery(api.users.get, { id: "123" })`

## Important Notes

### React 19 Migration

This project uses React 19, which has breaking changes:

- `children` is no longer implicit in component props (must type explicitly)
- Some hooks have new APIs (check React 19 migration guide if errors occur)
- Website uses React 19.2, Native uses React 19.1

### NativeWind Quirks

- NativeWind transforms Tailwind classes to React Native styles
- Not all Tailwind features work (e.g., pseudo-classes like `hover:` have limited support)
- Use `className` prop, not `class`
- Some CSS features require special handling (shadows, gradients)
- Check NativeWind docs when a class doesn't work as expected

### Convex Real-time Updates

- Queries automatically re-run when data changes (reactive)
- Use `useQuery` for reads, `useMutation` for writes
- Optimistic updates are automatic in many cases
- Auth state synced via Better Auth integration

### Turbo Caching

- Turbo caches build outputs in `.turbo/`
- Clear cache if you see stale builds: `rm -rf .turbo`
- Use `--force` to ignore cache: `turbo run build --force`

### Package Manager

- **Always use pnpm** (required by workspace setup)
- Install: `pnpm install`
- Add dependency: `pnpm add <package> --filter=<workspace-name>`
- Example: `pnpm add lodash --filter=website`

## Troubleshooting

**Type errors in one package but not others**:

- Check that package extends correct base config in `tsconfig.json`
- Run `pnpm run check-types` to see all errors across workspace
- Ensure `strict: true` is enabled

**Port 3000 already in use**:

```bash
lsof -i :3000 | awk '{print $2}' | tail -n +2 | xargs kill -9
```

**Native app won't start**:

- Clear Expo cache: `expo start -c`
- Rebuild: `expo prebuild --clean`
- Check iOS/Android simulator is running

**Convex connection issues**:

- Ensure backend dev server is running: `cd packages/backend && pnpm run dev`
- Check `.env` files have correct Convex URL
- Verify auth configuration in `convex/auth.config.ts`

**Build cache issues**:

```bash
rm -rf .turbo
rm -rf apps/website/.next
rm -rf apps/native/.expo
pnpm install
```

## Testing Before Commit

Run this checklist:

1. `pnpm run check-types` - No TypeScript errors
2. `pnpm run lint` - No ESLint warnings
3. `pnpm run format` - Code formatted
4. Test locally: `pnpm run dev` and verify both apps work

## Additional Resources

- Turborepo: https://turborepo.dev/
- Next.js 16: https://nextjs.org/docs
- Expo Router: https://docs.expo.dev/router/introduction/
- Convex: https://docs.convex.dev/
- NativeWind: https://www.nativewind.dev/
- Better Auth: https://www.better-auth.com/docs
