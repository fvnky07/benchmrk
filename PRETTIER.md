# Prettier Configuration

This project uses a global Prettier configuration at the root `.prettierrc.json` with support for Tailwind CSS class sorting via `prettier-plugin-tailwindcss`.

## Configuration Details

| Setting           | Value                         | Purpose                                             |
| ----------------- | ----------------------------- | --------------------------------------------------- |
| `printWidth`      | 80                            | Max line length for readability                     |
| `tabWidth`        | 2                             | Indent with 2 spaces                                |
| `useTabs`         | false                         | Use spaces, not tabs                                |
| `semi`            | true                          | Add semicolons to statements                        |
| `singleQuote`     | false                         | Use double quotes in JS                             |
| `jsxSingleQuote`  | false                         | Use double quotes in JSX                            |
| `trailingComma`   | "es5"                         | Add trailing commas where valid in ES5              |
| `bracketSpacing`  | true                          | Space inside object literals `{ key: value }`       |
| `bracketSameLine` | false                         | JSX closing bracket on new line                     |
| `arrowParens`     | "always"                      | Parentheses around single arrow function parameters |
| `endOfLine`       | "lf"                          | Unix line endings (LF)                              |
| `plugins`         | `prettier-plugin-tailwindcss` | Automatically sort Tailwind classes                 |

## Usage

### Format All Files

```bash
pnpm run format
```

### Format Specific Directory

```bash
pnpm prettier --write "apps/website/**/*.{ts,tsx,jsx,js}"
```

### Check Without Modifying

```bash
pnpm prettier --check "**/*.{ts,tsx,jsx,js,md}"
```

### Exclude Files

The `.prettierignore` file excludes common directories (node_modules, .next, dist, etc.)

## Tailwind CSS Sorting

The `prettier-plugin-tailwindcss` plugin automatically organizes Tailwind classes in a consistent order:

**Before:**

```jsx
<div className="bg-blue-500 px-2 text-white md:px-4">Content</div>
```

**After:**

```jsx
<div className="bg-blue-500 px-2 text-white md:px-4">Content</div>
```

Classes are sorted by:

1. Prefixes (responsive, dark mode, etc.)
2. Property category (layout, spacing, colors, etc.)
3. Property value

## IDE Integration

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Git Hook (Optional)

To auto-format on commit, install Husky and lint-staged:

```bash
pnpm add -D husky lint-staged
npx husky install
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,md}": "prettier --write"
  }
}
```

## Troubleshooting

If Prettier isn't picking up the config:

1. Verify `.prettierrc.json` exists in project root
2. Run `pnpm install` to ensure plugins are installed
3. Clear VS Code cache and reload window
4. Check that the file isn't in `.prettierignore`
