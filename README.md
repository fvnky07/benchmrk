<div align="center">
  <br />
  <img src="apps/website/public/logo.svg" width="72" alt="benchmrk" />
  <br />
  <br />

  <h3>benchmrk</h3>
  <p>Open-source fitness tracker for iOS & Android — real-time sync, social feed, self-hostable.</p>

  <p>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-AGPL%20v3-28E2A4?style=flat-square" alt="AGPL v3" />
    </a>
    <a href="./CONTRIBUTING.md">
      <img src="https://img.shields.io/badge/PRs-welcome-28E2A4?style=flat-square" alt="PRs Welcome" />
    </a>
    <img src="https://img.shields.io/badge/Expo-~54-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Convex-real--time-EF4823?style=flat-square" alt="Convex" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>

  <p>
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-tech-stack">Tech Stack</a> ·
    <a href="#-repo-layout">Repo Layout</a> ·
    <a href="./CONTRIBUTING.md">Contributing</a>
  </p>

  <br />
</div>

---

## Features

- **Custom workouts** — Build plans from a growing exercise catalog
- **Active session tracking** — Log sets, reps, weights, and duration in real time
- **Social feed** — Share completed sessions and see what your network is lifting
- **Real-time sync** — Powered by Convex; changes propagate instantly across all devices
- **Self-hostable** — Run the full stack for free, no vendor lock-in

## Screenshots

| Workout Session | Exercise Catalog | Social Feed |
|:-:|:-:|:-:|
| *coming soon* | *coming soon* | *coming soon* |

## Quick Start

**Prerequisites:** Node.js ≥ 18 · pnpm 10 · free [Convex](https://convex.dev) account · Xcode / Android Studio (for native builds)

```bash
# 1. Clone and install
git clone https://github.com/fvnky07/benchmrk
cd benchmrk
pnpm install

# 2. Copy environment templates
cp packages/backend/.env.example packages/backend/.env.local
cp apps/website/.env.example     apps/website/.env.local
cp apps/native/.env.example      apps/native/.env.local

# 3. Boot the backend
#    Interactive on first run — provisions a free Convex deployment and prints the URLs you need
cd packages/backend && pnpm run dev

# 4. In a new terminal, start everything
cd ../.. && pnpm run dev
```

Open `http://localhost:3000` for the web app. For native, scan the Expo QR code or run `expo run:ios` / `expo run:android` from `apps/native`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 54 · React Native 0.81 · Expo Router 6 · NativeWind 4 · Reanimated 4 |
| Web | Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI |
| Backend | Convex · Better Auth |
| Tooling | Turborepo · pnpm · Biome · TypeScript 5.9 |

## Repo Layout

```
benchmrk/
├── apps/
│   ├── native/          # Expo — iOS, Android, web
│   └── website/         # Next.js landing + web app
├── packages/
│   ├── backend/         # Convex schema, queries, mutations, auth
│   ├── ui/              # Shared React component primitives
│   └── typescript-config/
└── .github/
```

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm run dev` | Start all apps in parallel |
| `pnpm run dev:web` | Website only |
| `pnpm run build:ios` | Build iOS app |
| `pnpm run build:android` | Build Android app |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Auto-fix formatting |
| `pnpm run check-types` | Type-check all packages |

## Architecture

**Monorepo.** Turborepo orchestrates parallel builds and caching across pnpm workspaces. Each app and package has its own `package.json` and can be filtered independently with `--filter=<name>`.

**Auth.** Better Auth via `@convex-dev/better-auth`. Email/password today; OAuth providers, 2FA, and password reset are planned.

**Data.** Convex provides reactive real-time queries and mutations. Components subscribe via `useQuery` and write via `useMutation`; updates propagate automatically without polling.

**Styling.** Web uses Tailwind CSS 4 (`@tailwindcss/postcss`). Native uses NativeWind 4, which compiles Tailwind class names to React Native styles at build time.

## Roadmap

- [x] Workout creation + exercise catalog
- [x] Active workout session tracking (sets / reps / weights)
- [x] Social workout feed
- [ ] Premium subscription tier (RevenueCat + Stripe)
- [ ] Health-data integrations (Apple Health, Strava)
- [ ] Auth: forgot password, 2FA, OAuth providers

## Contributing

PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, branch conventions, commit format, and code style. Use [Discussions](https://github.com/fvnky07/benchmrk/discussions) for design questions and ideas, and [Issues](https://github.com/fvnky07/benchmrk/issues) for confirmed bugs.

## Security

Report vulnerabilities via [GitHub Security Advisories](https://github.com/fvnky07/benchmrk/security/advisories). Do not open public issues for security bugs. See [SECURITY.md](./SECURITY.md) for the full policy.

## License

benchmrk is licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).

Self-hosting is free. If you operate a modified version as a network service you must publish your modifications under the same license.

---

<div align="center">
  <sub>Built with <a href="https://convex.dev">Convex</a> · <a href="https://expo.dev">Expo</a> · <a href="https://nextjs.org">Next.js</a> · <a href="https://better-auth.com">Better Auth</a></sub>
</div>
