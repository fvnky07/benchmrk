# Contributing to benchmrk

Thanks for your interest in contributing. benchmrk is an open source fitness tracker and we welcome bug reports, feature ideas, and pull requests.

This document covers everything you need to run benchmrk locally and ship a change. The user-facing pitch lives in [README.md](./README.md).

## Prerequisites

- Node.js 18 or newer
- pnpm 10 (`npm install -g pnpm@10`)
- A free [Convex](https://convex.dev) account (the dev server creates one for you the first time you run it)
- For native development: Xcode (iOS) and/or Android Studio

## Setup

```bash
git clone https://github.com/<your-fork>/benchmrk
cd benchmrk
pnpm install
```

Copy each environment template and fill in the values:

```bash
cp packages/backend/.env.example packages/backend/.env.local
cp apps/website/.env.example     apps/website/.env.local
cp apps/native/.env.example      apps/native/.env.local
```

The Convex URLs come from running `cd packages/backend && pnpm run dev` for the first time — it provisions a deployment and prints the URLs you need.

## Parallel worktrees

Use one worktree per feature or agent. This command creates an isolated,
five-day Convex development deployment for the current worktree, deploys its
functions once, and writes its ignored web and native Convex client URLs:

```bash
git worktree add ../worktrees/my-feature -b my-feature
cd ../worktrees/my-feature
pnpm install
pnpm run worktree:setup
```

The primary checkout must already have a configured
`packages/backend/.env.local`; the setup command uses only its
`CONVEX_DEPLOYMENT` to locate the same Convex project. It does not copy secrets.
Each worktree can then run `pnpm run dev:web` independently; Next.js selects
the next available localhost port. Do not run `worktree:setup` in the primary
checkout.

New cloud development deployments receive only project environment-variable
defaults. Configure required backend secrets such as `BETTER_AUTH_SECRET` in
the Convex project's development defaults before creating agent worktrees.

## Backend environment variables

Set these on each Convex deployment with
`pnpm -F @repo/backend exec convex env set NAME value` (add `--prod` for
production). Never commit their values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `BETTER_AUTH_SECRET` | yes | Signs sessions and magic-link proofs |
| `SITE_URL` | yes | Website origin for auth callbacks and emailed links |
| `RESEND_API_KEY` | yes | Sends transactional email; without it nothing is mailed |
| `DELETION_REQUEST_NOTIFY_EMAIL` | production | Maintainer inbox for confirmed website deletion requests |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_IOS_CLIENT_ID` | for Google sign-in | Google OAuth clients |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_APP_BUNDLE_IDENTIFIER` | for Apple sign-in | Sign in with Apple |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | for Apple sign-in | Sign in with Apple key (`.p8` contents) used to revoke a member's Apple authorization when they delete their account |

## Deletion requests

Google Play requires a web page for deleting an account without the app:
`/delete-account` on the website (linked from the privacy policy). A request
is recorded in the `deletionRequests` table only after the requester opens the
emailed confirmation link, and the same email never creates a second request.
Each confirmed request emails `DELETION_REQUEST_NOTIFY_EMAIL`. Delete that
identity and its data within 30 days, then reply to the requester to say it's
done; the page promises both.

## Running the apps

```bash
# Backend (interactive — keep this open in its own terminal)
cd packages/backend && pnpm run dev

# Everything else, in parallel, from the repo root
pnpm run dev

# Or one at a time
pnpm run dev:web                                  # Next.js website
cd apps/native && pnpm run dev                    # Expo dev server
```

Open `http://localhost:3000` for the web app. For native, the `pnpm run dev` script in `apps/native` runs `expo start` under the hood — scan the Expo QR code it prints, or press `i` / `a` to launch the iOS or Android simulator.

The shared Exercise catalog lives in `packages/backend/convex/lib/exerciseCatalog.ts`. Seed it into a new deployment once with `pnpm -F @repo/backend exec convex run init:seed`. Seeding only adds missing Exercises and never rewrites one, and after seeding the database is the source of truth, so catalog changes must only ever add Exercises.

## Releasing the app

Both stores use the identifier `com.benchmrk.app`. Builds run on EAS from
`apps/native`; `eas.json` decides which Convex deployment a build talks to:

| Build profile | Backend | Notes |
|---------------|---------|-------|
| `development` | Development (`EXPO_PUBLIC_CONVEX_*` in your `.env.local`) | Dev client; JavaScript comes from your local Metro server |
| `production` | Production (`friendly-finch-491`) | Store build; version auto-increments on EAS |

Release steps, run from the repo root:

```bash
# 1. Deploy the backend the build will use
pnpm -F @repo/backend exec convex deploy

# 2. Build both platforms on EAS
cd apps/native
npx eas-cli build --profile production --platform all

# 3. Submit: iOS goes to App Store Connect (TestFlight), Android to the
#    Play internal testing track
npx eas-cli submit --profile production --platform ios --latest
npx eas-cli submit --profile production --platform android --latest
```

Before the first production release:

- Set the backend variables above on the production deployment
  (`convex env set --prod`); `APPLE_APP_BUNDLE_IDENTIFIER` is `com.benchmrk.app`.
- Register `com.benchmrk.app` with Sign in with Apple, and create a Google iOS
  OAuth client for it; set its URL scheme as the `GOOGLE_IOS_URL_SCHEME` EAS
  variable in the `production` environment
  (`npx eas-cli env:create --environment production`).
- Store PostHog keys the same way if analytics should ship.

To check a production bundle locally, export it with the production URLs and
`--clear`; Metro otherwise reuses cached values from `.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://friendly-finch-491.convex.cloud \
EXPO_PUBLIC_CONVEX_SITE_URL=https://friendly-finch-491.convex.site \
npx expo export --clear --platform android
```

## Repo layout

```
benchmrk/
├── apps/
│   ├── native/          # Expo — iOS, Android, web
│   └── website/         # Next.js landing + web app
├── packages/
│   ├── backend/         # Convex schema, queries, mutations, auth
│   ├── ui/              # Shared React component primitives
│   └── typescript-config/
├── assets/              # Brand assets (banner, screenshots)
└── .github/
```

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm run dev` | Start all apps in parallel |
| `pnpm run dev:web` | Website only |
| `pnpm run build` | Build all packages |
| `pnpm run build:web` | Build website |
| `pnpm run build:ios` | Local debug build on the iOS simulator (store builds: see Releasing the app) |
| `pnpm run build:android` | Local debug build on the Android emulator (store builds: see Releasing the app) |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Auto-fix formatting |
| `pnpm run check-types` | Type-check all packages |

Each workspace can be filtered with `--filter=<name>` (e.g. `turbo run check-types --filter=website`).

## Architecture

**Monorepo.** Turborepo orchestrates parallel builds and caching across pnpm workspaces. Each app and package has its own `package.json` and can be filtered independently with `--filter=<name>`.

**Auth.** Better Auth via `@convex-dev/better-auth` implements email/password, native Apple and Google Social sign-in, magic links for confirmed Waitlist identities, email verification, password reset and optional TOTP two-factor authentication.

**Data.** Convex provides reactive real-time queries and mutations. Components subscribe via `useQuery` and write via `useMutation`; updates propagate automatically without polling.

**Styling.** Web uses Tailwind CSS 4 (`@tailwindcss/postcss`). Native uses `@expo/ui` native-first universal components backed by SwiftUI and Jetpack Compose, plus system components and narrow native extensions for confirmed gaps. Embed React Native views in an `@expo/ui` layout through `RNHostView`. NativeWind and NativeWind fallbacks were retired in #168.

## Tests

```bash
pnpm -F @repo/backend test        # vitest — backend logic and Convex schema
pnpm -F @native/app test          # jest + jest-expo — native components
```

## Pre-commit checklist

Before opening a pull request:

```bash
pnpm run check-types              # TypeScript across all workspaces
pnpm run lint                     # Biome (lint + format check)
pnpm run format                   # Auto-fix formatting
```

## Commit format

We use [Conventional Commits](https://www.conventionalcommits.org/) with workspace scopes and issue references: `type(scope): description (#N)`. Examples:

```
feat(native): add the Group view inside the Workout (#160)
fix(backend): respect Group notification preferences (#170)
refactor(native): retire NativeWind fallbacks (#168)
docs(native): document the native-first UI standard (#168)
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`. Common scopes: `native`, `website`, `backend`, `deps`.

## Branch naming

- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, deps, infrastructure
- `docs/<short-description>` — documentation only

## Pull requests

1. Fork the repo and create your branch from `main`
2. Write tests for new behavior where it makes sense
3. Make sure `check-types`, `lint`, and `test` all pass locally
4. Open a PR against `main` using the template
5. CI will run automatically; reviewers will look at correctness, scope, and consistency with existing patterns

We may suggest changes — that's normal and not a rejection.

## Where to ask questions

- Use [GitHub Discussions](https://github.com/fvnky07/benchmrk/discussions) for design questions, feature ideas, and "how do I..." threads
- Use [GitHub Issues](https://github.com/fvnky07/benchmrk/issues) for confirmed bugs and concrete feature requests

## License

By contributing, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).
