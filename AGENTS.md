## Repository Structure

├── apps:/
├── native//
├── website//
├── /
├── packages:/
├── backend//
├── eslint-config//
├── typescript-config//
├── ui//

## Build, Lint, Test Commands

### Build

pnpm run build # turbo run build
pnpm run build:web # turbo run build --filter=website
pnpm run build:ios # turbo run build:ios --filter=@native/app
pnpm run build:android # turbo run build:android --filter=@native/app

### Type Checking

pnpm run check-types # turbo run check-types
pnpm turbo run check-types --filter=website
pnpm turbo run check-types --filter=@mobile/app

### Linting

pnpm run lint # turbo run lint
pnpm turbo run lint --filter=website
pnpm turbo run lint --filter=@mobile/app

### Formatting

pnpm run format # prettier --write "**/\*.{ts,tsx,md}"
prettier --write "apps/website/**/\*.{ts,tsx}" # Specific files

### Dev Servers

pnpm run dev # turbo run dev --parallel
pnpm run dev:web # turbo run dev --filter=website

## Code Style Guidelines

### Imports & Organization

- **Order**: External dependencies → Relative imports (parent to child)
- **Structure**: Group by type (React, utilities, types, components)
- **Path aliases**: Use `@/*` in Next.js; `@repo/*` for monorepo packages
- **Avoid**: Circular dependencies; use workspace: protocol in package.json

### TypeScript & Typing

- **Strict mode**: Enabled globally (`strict: true` in tsconfig.json)
- **No implicit any**: Use explicit types for functions and variables
- **Interfaces over types**: Use `interface` for object shapes, `type` for unions/primitives
- **Readonly props**: Mark component props with `Readonly<>`
- **React.FC not needed**: Use direct function declarations with return type

### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `CardLayout`, `UserProfile`)
- **Functions/variables**: camelCase (e.g., `handleClick`, `getUserData`, `isValid`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Files**: Use component name in PascalCase for React files
- **Exports**: Prefer named exports; use `export const Component = ...`

### Formatting Rules (Prettier)

- **Line length**: 80 characters
- **Tabs**: 2 spaces
- **Quotes**: Single quotes in JS, double quotes in JSX
- **Semicolons**: Always included
- **Trailing commas**: ES5 (multiline only)
- **Tailwind CSS**: Classes automatically sorted by prettier-plugin-tailwindcss

Run `pnpm run format` before committing.

### React & Next.js Conventions

- **Server/Client components**: Use `"use client"` at top of file for client components
- **Props destructuring**: Always destructure in function signature
- **Default exports**: Use for app pages only; use named exports elsewhere
- **Hooks**: Call only at component top level; follow rules-of-hooks

### Error Handling

- **Try/catch**: Use for async operations; provide meaningful error messages
- **Error types**: Use `Error` base class or create domain-specific error classes
- - **Logging**: Use `console.error()` for errors, avoid silent failures
- **Type guards**: Check for undefined/null before accessing properties

### Comments & Documentation

- **Use sparingly**: Code should be self-documenting
- **JSDoc for exported functions**: Document parameters and return types
- **TODO/HACK/FIXME**: Use inline comments with context
- **Complex logic**: Add comments explaining why, not what

## Monorepo Conventions

### Workspace Dependencies

- **Reference format**: `@repo/package-name` for packages, app names for apps
- **Version spec**: Use `workspace:*` in package.json
- **Installation**: `pnpm install` (respects workspace links)

### Creating New Packages

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with name, scripts, and dependencies
3. Update `turbo.json` if adding new task types
4. Run `pnpm install` to link workspace packages

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

## Testing & Verification Checklist

Before committing:

- [ ] Run `pnpm run check-types` - all packages pass
- [ ] Run `pnpm run lint` - no linting errors
- [ ] Run `pnpm run format` - code formatted consistently
- [ ] Test changes locally: `pnpm run dev:all` or specific dev server
- [ ] Verify new packages in `turbo.json` if created

## Troubleshooting

### Common Issues

- **Port conflicts**: Kill process: `lsof -i :3000 | awk '{print }' | xargs kill -9`
- **Missing deps**: Run `pnpm install`
- **Type errors**: Check tsconfig.json extends and strictness
