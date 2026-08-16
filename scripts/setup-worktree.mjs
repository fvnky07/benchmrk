#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const dryRun = process.argv.includes('--dry-run');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  if (dryRun) {
    console.log(`$ ${[command, ...args].join(' ')}`);
    return '';
  }

  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  }).trim();
}

function readEnvValue(path, name) {
  if (!existsSync(path)) {
    return undefined;
  }

  const match = readFileSync(path, 'utf8').match(
    new RegExp(`^${name}=(.*)$`, 'm')
  );

  return match?.[1]?.trim();
}

function writePublicConvexEnv(path, entries) {
  if (existsSync(path)) {
    const existingUrl = readEnvValue(path, entries[0][0]);

    if (existingUrl === entries[0][1]) {
      return;
    }

    fail(
      `${path} already exists with a different Convex deployment; remove it or update it before retrying`
    );
  }

  writeFileSync(
    path,
    `${entries.map(([name, value]) => `${name}=${value}`).join('\n')}\n`,
    { mode: 0o600 }
  );
}

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const commonGitDirectory = execFileSync(
  'git',
  ['rev-parse', '--path-format=absolute', '--git-common-dir'],
  { cwd: repositoryRoot, encoding: 'utf8' }
).trim();
const primaryRoot = dirname(commonGitDirectory);

if (repositoryRoot === primaryRoot) {
  fail('run this command from a linked Git worktree, not the primary checkout');
}

const worktreeName = basename(repositoryRoot)
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-|-$/g, '');
const owner = (process.env.USER ?? 'developer')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-');

if (!worktreeName) {
  fail('could not derive a deployment name from the worktree path');
}

const primaryDeployment = readEnvValue(
  join(primaryRoot, 'packages/backend/.env.local'),
  'CONVEX_DEPLOYMENT'
);

if (!primaryDeployment) {
  fail(
    'missing CONVEX_DEPLOYMENT in the primary checkout; run pnpm --filter @repo/backend dev there first'
  );
}

const deployment = `dev/${owner}/${worktreeName}`;
const convexEnvironment = {
  ...process.env,
  CONVEX_DEPLOYMENT: primaryDeployment,
};

console.log(`Preparing isolated Convex deployment ${deployment}`);

try {
  run(
    'pnpm',
    [
      '--filter',
      '@repo/backend',
      'exec',
      'convex',
      'deployment',
      'select',
      deployment,
    ],
    { env: convexEnvironment }
  );
} catch {
  run(
    'pnpm',
    [
      '--filter',
      '@repo/backend',
      'exec',
      'convex',
      'deployment',
      'create',
      deployment,
      '--type',
      'dev',
      '--select',
      '--expiration',
      'in 7 days',
    ],
    { env: convexEnvironment }
  );
}

run('pnpm', ['--filter', '@repo/backend', 'exec', 'convex', 'dev', '--once']);

if (dryRun) {
  process.exit(0);
}

const backendEnvPath = join(repositoryRoot, 'packages/backend/.env.local');
const convexUrl = readEnvValue(backendEnvPath, 'CONVEX_URL');

if (!convexUrl?.endsWith('.convex.cloud')) {
  fail(`missing a Convex cloud URL in ${backendEnvPath}`);
}

const convexSiteUrl = convexUrl.replace(/\.convex\.cloud$/, '.convex.site');

writePublicConvexEnv(join(repositoryRoot, 'apps/website/.env.local'), [
  ['NEXT_PUBLIC_CONVEX_URL', convexUrl],
  ['NEXT_PUBLIC_CONVEX_SITE_URL', convexSiteUrl],
]);
writePublicConvexEnv(join(repositoryRoot, 'apps/native/.env.local'), [
  ['EXPO_PUBLIC_CONVEX_URL', convexUrl],
  ['EXPO_PUBLIC_CONVEX_SITE_URL', convexSiteUrl],
]);

console.log(`Configured web and native clients for ${convexUrl}`);
