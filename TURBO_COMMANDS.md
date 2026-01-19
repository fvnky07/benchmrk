# Turborepo Commands Guide

Complete guide to building and developing all apps in the benchmrk monorepo.

## Understanding Dev vs Start

- **`dev`**: Runs development servers with hot reload (e.g., `next dev`, `expo start`, `convex dev`)
  - Used during development with file watching and auto-refresh
  - Typically on local ports: Next.js (3000), Expo (8081), Convex (5173)

- **`start`**: Runs production servers or production-like environments
  - For Next.js: serves pre-built production bundle
  - For Expo: opens the Expo CLI dev server for mobile testing
  - For Convex: same as dev (no production runtime)

## Build Commands

### Build All Apps

```bash
pnpm run build:all
```

Builds all applications and packages in parallel:

- **website** (Next.js) → `.next/` directory
- **@mobile/app** (Expo) → web bundle
- **@repo/backend** (Convex) → ready to deploy

### Build Individual Apps

```bash
# Build only the Next.js website
pnpm run build:web

# Build only the Expo mobile app (web version)
pnpm run build:mobile
```

### Mobile-Specific Builds

```bash
# Build for iOS (requires macOS and Xcode)
pnpm run build:ios

# Build for Android (requires Android SDK)
pnpm run build:android

# Build for Web, iOS, and Android simultaneously
pnpm run build:web-ios-android
```

**Note**: iOS and Android builds run in parallel with web build.

## Development Commands

### Run All Dev Servers Simultaneously

```bash
pnpm run dev:all
```

Starts all development servers in parallel:

- **Next.js** (website): http://localhost:3000
- **Expo CLI** (@mobile/app): http://localhost:8081 (web preview)
- **Convex** (@repo/backend): http://localhost:5173 (dev dashboard)

Each dev server runs with hot reload and file watching enabled.

### Run Individual Dev Servers

```bash
# Run only Next.js dev server
pnpm turbo run dev --filter=website

# Run only Expo dev server
pnpm turbo run dev --filter=@mobile/app

# Run only Convex dev server
pnpm turbo run dev --filter=@repo/backend

# Run Expo and Convex together
pnpm turbo run dev --filter='@mobile/app' --filter='@repo/backend'
```

### Platform-Specific Expo Development

```bash
# Start Expo dev server, choose platform interactively
pnpm turbo run start --filter=@mobile/app

# Run Expo on iOS (requires macOS and Xcode)
pnpm turbo run ios --filter=@mobile/app

# Run Expo on Android (requires Android emulator/device)
pnpm turbo run android --filter=@mobile/app

# Run Expo on web
pnpm turbo run web --filter=@mobile/app
```

## Workspace Structure

```
apps/
├── mobile/          (@mobile/app) - Expo + React Native
└── website/         (website) - Next.js

packages/
├── backend/         (@repo/backend) - Convex backend
├── eslint-config/   (@repo/eslint-config)
├── typescript-config (@repo/typescript-config)
└── ui/              (@repo/ui)
```

## Advanced Filtering

### Run Tasks on Multiple Packages

```bash
# Run build on all apps (excluding packages)
pnpm turbo run build --filter='./apps/*'

# Run dev on all packages
pnpm turbo run dev --filter='./packages/*'

# Run check-types on website and mobile
pnpm turbo run check-types --filter=website --filter=@mobile/app
```

## Other Commands

```bash
# Lint all packages
pnpm run lint

# Type-check all packages
pnpm run check-types

# Format all code
pnpm run format

# Standard build (runs for all packages with build scripts)
pnpm run build

# Standard dev (runs for all packages with dev scripts)
pnpm run dev
```

## Full Workflow Example

### Development Session

```bash
# 1. Install dependencies
pnpm install

# 2. Start all dev servers
pnpm run dev:all

# 3. Open browsers to access:
#    - Website: http://localhost:3000
#    - Expo Web: http://localhost:8081
#    - Convex Dashboard: http://localhost:5173
```

### Production Build

```bash
# 1. Type-check everything
pnpm run check-types

# 2. Lint everything
pnpm run lint

# 3. Build all apps
pnpm run build:all

# 4. Results:
#    - apps/website/.next/        (Next.js build)
#    - apps/mobile/dist/          (Expo web bundle)
#    - packages/backend/ ready    (Convex deployment ready)
```

### Cross-Platform Development

```bash
# 1. Start dev servers
pnpm run dev:all

# 2. In another terminal, start iOS development
pnpm turbo run ios --filter=@mobile/app

# 3. In yet another terminal, start Android development
pnpm turbo run android --filter=@mobile/app

# 4. You now have:
#    - Website dev server running
#    - Convex backend running
#    - iOS simulator running
#    - Android emulator running (in parallel)
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Kill all Node processes
pkill -f "node"

# Or kill specific processes
lsof -i :3000     # Find process on port 3000
kill -9 <PID>
```

### Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Mobile Build Issues

```bash
# Reset Expo cache
pnpm turbo run reset-project --filter=@mobile/app

# Clear Expo build cache
rm -rf apps/mobile/.expo/
```

## Performance Tips

1. **Use `--filter`** to run only what you need
2. **Use `--parallel`** for dev to run multiple servers simultaneously
3. **Build order** is automatically handled by Turbo (respects dependencies)
4. **Incremental builds** are cached - only changed packages rebuild
5. **Watch mode** is enabled by default for dev tasks

## Environment Variables

### Backend (Convex)

Create `.env.local` in `packages/backend/`:

```env
CONVEX_DEPLOYMENT=<your-deployment-url>
```

### Website (Next.js)

Create `.env.local` in `apps/website/`:

```env
# Backend API URL
NEXT_PUBLIC_CONVEX_URL=<convex-url>
```

### Mobile (Expo)

Create `.env.local` in `apps/mobile/`:

```env
# Backend API URL
EXPO_PUBLIC_CONVEX_URL=<convex-url>
```

## Script Reference

| Command                  | Purpose            | Runs                                 |
| ------------------------ | ------------------ | ------------------------------------ |
| `pnpm run build`         | Build all packages | All packages with build script       |
| `pnpm run build:all`     | Build all apps     | apps/\* + packages/backend           |
| `pnpm run build:web`     | Build Next.js      | website only                         |
| `pnpm run build:mobile`  | Build Expo web     | @mobile/app only                     |
| `pnpm run build:ios`     | Build for iOS      | @mobile/app iOS builder              |
| `pnpm run build:android` | Build for Android  | @mobile/app Android builder          |
| `pnpm run dev`           | Dev all packages   | All packages with dev script         |
| `pnpm run dev:all`       | Dev all apps       | apps/\* + packages/backend           |
| `pnpm run lint`          | Lint all           | All packages with lint script        |
| `pnpm run check-types`   | Type-check all     | All packages with check-types script |
| `pnpm run format`        | Format code        | All code files                       |
