import { nextJsConfig } from '@repo/eslint-config/next-js';
import { globalIgnores } from 'eslint/config';

const eslintConfig = [
  ...nextJsConfig,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.source/**', // fumadocs auto-generated files
    '../../packages/backend/convex/_generated/**', // convex generated files
  ]),
];

export default eslintConfig;
