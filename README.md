<img src="apps/website/public/logo.svg" width="120" alt="benchmrk" />

# benchmrk

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Built with Convex](https://img.shields.io/badge/Built%20with-Convex-orange)](https://convex.dev)
[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000020?logo=expo)](https://expo.dev)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?logo=next.js)](https://nextjs.org)

## What is benchmrk?

benchmrk is an open source fitness tracker for iOS and Android (built with Expo) with a companion web app. It lets you build custom workouts from an exercise catalog, run active workout sessions tracking sets, reps, weights, and duration, and share sessions to a social feed. Self-hosting is free. A managed premium tier with additional features is planned but not yet implemented.

## Screenshots

<!-- TODO: add screenshots once UI stabilizes -->

| App | Website |
|-----|---------|
| _coming soon_ | _coming soon_ |

## Tech stack

- **Mobile:** Expo SDK 54, React Native 0.81, Expo Router 6, NativeWind 4, Reanimated 4
- **Web:** Next.js 16, React 19, Tailwind CSS 4, Radix UI
- **Backend:** Convex (real-time DB + serverless functions), Better Auth
- **Tooling:** Turborepo, pnpm workspaces, Biome (lint + format), TypeScript 5.9, Vitest (backend), Jest + jest-expo (native)

## Quick start

```bash
git clone https://github.com/<your-fork>/benchmrk
cd benchmrk
pnpm install

# Copy env templates and fill in (see CONTRIBUTING.md for what each var means)
cp packages/backend/.env.example packages/backend/.env.local
cp apps/website/.env.example apps/website/.env.local
cp apps/native/.env.example apps/native/.env.local

# Boot Convex (interactive — creates a free dev deployment on first run)
cd packages/backend && pnpm run dev
# In a new shell, boot everything:
cd ../.. && pnpm run dev
```

## Repo layout

```
benchmrk/
├── apps/
│   ├── native/          Expo (iOS, Android, web)
│   └── website/         Next.js landing + web app
├── packages/
│   ├── backend/         Convex schema + server functions
│   ├── ui/              Shared React component primitives
│   └── typescript-config/
└── .github/
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start all apps in parallel |
| `pnpm run dev:web` | Website only |
| `pnpm run build` | Build all packages |
| `pnpm run build:web` | Build website |
| `pnpm run build:ios` | Build iOS app |
| `pnpm run build:android` | Build Android app |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Format with Biome |
| `pnpm run check-types` | Type-check all packages |

## Architecture

**Monorepo.** Turborepo orchestrates parallel builds and caching across pnpm workspaces. Each app and package has its own `package.json` and can be filtered independently with `--filter=<name>`. Shared TypeScript config lives in `packages/typescript-config`.

**Auth.** Authentication is handled by Better Auth via the `@convex-dev/better-auth` integration. Auth config lives in `packages/backend/convex/betterAuth/`. The foundation supports email/password today; OAuth providers, 2FA, and password reset are planned.

**Data.** Convex provides reactive real-time queries and mutations. The database schema is defined in `packages/backend/convex/schema.ts`. Frontend components subscribe to queries via `useQuery` and write via `useMutation`; updates propagate automatically without polling.

**Styling.** The web app uses Tailwind CSS 4 (CSS-first architecture via `@tailwindcss/postcss`). The native app uses NativeWind 4, which compiles Tailwind class names to React Native styles at build time via the `className` prop.

## Roadmap

- [x] Workout creation + exercise catalog
- [x] Active workout session tracking (sets/reps/weights)
- [x] Social workout feed
- [ ] Premium subscription tier (RevenueCat + Stripe — planned)
- [ ] Health-data integrations (Apple Health, Strava — schema present, wiring pending)
- [ ] Auth: forgot password, 2FA, OAuth providers (foundation present)

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, branch conventions, and code style.

## Security

Report vulnerabilities via [GitHub Security Advisories](https://github.com/fvnky07/benchmrk/security/advisories). Do not open public issues for security bugs. See [SECURITY.md](./SECURITY.md) for policy details.

## License

benchmrk is licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).

The AGPL choice means: anyone can self-host, fork, modify, and study the code. If you operate a modified version as a network service, you must publish your modifications under the same license. Hosted premium features and managed infrastructure are not part of the OSS core.

## Acknowledgements

benchmrk is built on the shoulders of these open source projects:

- [Convex](https://convex.dev)
- [Expo](https://expo.dev)
- [Next.js](https://nextjs.org)
- [Better Auth](https://better-auth.com)
- [NativeWind](https://nativewind.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Biome](https://biomejs.dev)
- [Turborepo](https://turbo.build/repo)
