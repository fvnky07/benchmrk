# Benchmrk - Fitness Tracking Platform

A modern fitness tracking application with AI-powered coaching, built with a Turborepo monorepo architecture.

## 📦 Project Structure

```
benchmrk/
├── apps/
│   ├── website/          # Next.js 16 landing page & web app
│   └── mobile/           # Expo React Native mobile app
├── packages/
│   ├── backend/          # Convex backend (real-time database & auth)
│   ├── ui/               # Shared React component library
│   ├── eslint-config/    # Shared ESLint configurations
│   └── typescript-config/# Shared TypeScript configurations
└── [config files]
```

## 🛠 Tech Stack

### Frontend
- **Website** (apps/website)
  - [Next.js 16](https://nextjs.org/) - React framework with App Router
  - [TypeScript 5.9](https://www.typescriptlang.org/) - Type safety
  - [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
  - [Radix UI](https://www.radix-ui.com/) - Accessible components (Accordion, Navigation, Popover)
  - [Lucide React](https://lucide.dev/) - Icon library
  - [GSAP](https://gsap.com/) - Animation library
  - [shadcn/ui](https://ui.shadcn.com/) - UI component system

- **Mobile** (apps/mobile)
  - [Expo ~54](https://expo.dev/) - React Native framework
  - [React Native 0.81](https://reactnative.dev/) - Mobile UI
  - [Expo Router 6](https://docs.expo.dev/router/introduction/) - File-based routing
  - [React Navigation 7](https://reactnavigation.org/) - Navigation library
  - [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) - Animations

### Backend
- **Convex** (packages/backend)
  - Real-time database
  - Server functions
  - Authentication
  - File storage

### Development
- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk-efficient package manager
- **ESLint 9** - Linting
- **Prettier 3** - Code formatting (80 char line width)
- **TypeScript** - Strict mode enabled across all packages

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 9.0.0

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd benchmrk

# Install dependencies
pnpm install
```

### Development
```bash
# Run all apps (website + mobile + backend)
pnpm run dev:all

# Run specific app
pnpm run dev:web      # Website only (http://localhost:3000)
pnpm run dev:mobile   # Mobile only (Expo)

# Run backend
cd packages/backend && pnpm run dev
```

## 📝 Available Scripts

### Build
```bash
pnpm run build:all       # Build all apps
pnpm run build:web       # Build website
pnpm run build:mobile    # Build mobile app
pnpm run build:ios       # Build iOS
pnpm run build:android   # Build Android
```

### Quality Checks
```bash
pnpm run lint            # Lint all packages
pnpm run check-types     # Type-check all packages
pnpm run format          # Format all code with Prettier
```

### Targeted Commands
```bash
# Run command on specific package
pnpm turbo run <command> --filter=website
pnpm turbo run <command> --filter=@mobile/app
pnpm turbo run <command> --filter=@repo/backend
```

## 🏗 Architecture

### Monorepo Workspace
- Uses **pnpm workspaces** for dependency management
- Packages reference each other with `workspace:*` protocol
- Shared configs for TypeScript, ESLint, and Prettier

### Turborepo Tasks
- **Parallel execution**: Multiple apps run simultaneously with `--parallel`
- **Incremental builds**: Only rebuilds changed packages
- **Remote caching**: Share build cache across team (optional)

### Path Aliases
- **Website**: `@/*` resolves to `apps/website/`
- **Monorepo packages**: `@repo/*` for shared packages

## 📂 Key Directories

### apps/website
```
website/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Base UI components (shadcn)
│   ├── sections/    # Landing page sections
│   └── navbar.tsx   # Navigation
├── lib/             # Utility functions
├── public/          # Static assets (images, videos)
└── tailwind.config.ts
```

### apps/mobile
```
mobile/
├── app/             # Expo Router pages
├── components/      # React Native components
├── assets/          # Images, fonts
└── package.json
```

### packages/backend
```
backend/
├── convex/          # Convex functions and schema
│   ├── _generated/  # Auto-generated types
│   └── schema.ts    # Database schema
└── package.json
```

## 🎨 Design System

- **Colors**: Custom palette defined in Tailwind config
- **Spacing**: Consistent scale using Tailwind utilities
- **Components**: Built with Radix UI primitives + shadcn/ui patterns
- **Responsive**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- **Animations**: GSAP for complex animations, CSS for simple transitions

## 🔧 Configuration Files

- `.prettierrc.json` - Code formatting (80 chars, single quotes, 2 spaces)
- `turbo.json` - Build pipeline configuration
- `pnpm-workspace.yaml` - Workspace package definitions
- `tsconfig.json` - TypeScript strict mode, path aliases
- `eslint.config.js` - Linting rules per package

## 📱 Mobile Development

### Run on Device
```bash
# iOS
pnpm run ios

# Android
pnpm run android
```

### Build for Production
```bash
# Prebuild native projects
expo prebuild --clean

# Build binaries
pnpm run build:ios
pnpm run build:android
```

## 🧪 Testing & Quality

Before committing:
1. ✅ `pnpm run check-types` - No TypeScript errors
2. ✅ `pnpm run lint` - No ESLint warnings
3. ✅ `pnpm run format` - Code formatted consistently
4. ✅ Test locally with `pnpm run dev:all`

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -i :3000 | awk '{print $2}' | xargs kill -9
```

### Dependencies Not Found
```bash
pnpm install
```

### Type Errors
- Check `tsconfig.json` extends correct base config
- Ensure `strict: true` is enabled
- Run `pnpm run check-types` to see all errors

### Build Cache Issues
```bash
# Clear Turbo cache
rm -rf .turbo

# Clear Next.js cache
rm -rf apps/website/.next
```

## 📚 Documentation

- [AGENTS.md](./AGENTS.md) - Guidelines for AI coding agents
- [TURBO_COMMANDS.md](./TURBO_COMMANDS.md) - Turborepo command reference
- [PRETTIER.md](./PRETTIER.md) - Prettier configuration details

## 🔗 Useful Links

- [Turborepo Docs](https://turborepo.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Convex Docs](https://docs.convex.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

## 📄 License

**Copyright © 2024-2026 Benchmrk. All Rights Reserved.**

This software and associated documentation files (the "Software") are the proprietary and confidential information of Benchmrk. The Software is protected by copyright laws and international copyright treaties, as well as other intellectual property laws and treaties.

### Restrictions

**NO LICENSE IS GRANTED.** You may not:

- Use, copy, modify, merge, publish, distribute, sublicense, or sell copies of the Software
- Reverse engineer, decompile, or disassemble the Software
- Remove or alter any proprietary notices or labels on the Software
- Transfer, rent, lease, or lend the Software to any third party
- Use the Software for any commercial or non-commercial purposes
- Access or use the Software in any way without explicit written permission

### Confidentiality

This Software contains trade secrets and confidential information. Unauthorized disclosure, copying, distribution, or use of this Software, in whole or in part, is strictly prohibited and may result in severe civil and criminal penalties.

### Non-Disclosure Agreement

By accessing this repository, you acknowledge that:

1. You have signed a Non-Disclosure Agreement (NDA) with Benchmrk
2. You will maintain the confidentiality of all information contained herein
3. You will not disclose any information to unauthorized parties
4. You will use the information solely for authorized purposes as defined in your agreement

### Legal Action

Unauthorized use, reproduction, or distribution of this Software may result in:
- Immediate termination of access
- Legal action including injunctive relief
- Claims for monetary damages
- Criminal prosecution under applicable laws

**For licensing inquiries, contact: [legal@benchmrk.com]**
