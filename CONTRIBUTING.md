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

Open `http://localhost:3000` for the web app. For native, scan the Expo QR code printed by `expo start`.

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
| `pnpm run build:ios` | Build iOS app |
| `pnpm run build:android` | Build Android app |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Auto-fix formatting |
| `pnpm run check-types` | Type-check all packages |

Each workspace can be filtered with `--filter=<name>` (e.g. `turbo run check-types --filter=website`).

## Architecture

**Monorepo.** Turborepo orchestrates parallel builds and caching across pnpm workspaces. Each app and package has its own `package.json` and can be filtered independently with `--filter=<name>`.

**Auth.** Better Auth via `@convex-dev/better-auth`. Email/password today; OAuth providers, 2FA, and password reset are planned.

**Data.** Convex provides reactive real-time queries and mutations. Components subscribe via `useQuery` and write via `useMutation`; updates propagate automatically without polling.

**Styling.** Web uses Tailwind CSS 4 (`@tailwindcss/postcss`). Native uses NativeWind 4, which compiles Tailwind class names to React Native styles at build time.

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

We use [Conventional Commits](https://www.conventionalcommits.org/) with workspace scopes. Examples drawn from recent history:

```
feat(native): add active workout mini player
fix(backend): handle missing user identity in workout query
chore(deps): bump @react-navigation/bottom-tabs to 7.15.11
docs: clarify env var setup in README
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
