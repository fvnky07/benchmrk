#!/usr/bin/env node

// The native app's `dev` task. It builds the development client, installs it
// on the Android phone connected over wireless debugging and serves JavaScript
// from this checkout. With --check it only verifies the phone and Metro's port,
// so the root `dev` script can fail before turbo starts anything.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { homedir, networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expoBin = join(projectRoot, 'node_modules', '.bin', 'expo');
const fingerprintStampPath = join(projectRoot, 'android', '.dev-fingerprint');
const metroPort = 8081;
const checkOnly = process.argv.includes('--check');

const stateHints = {
  unauthorized: 'unlock the phone and accept the "Allow debugging" prompt',
  authorizing: 'unlock the phone and accept the "Allow debugging" prompt',
  offline: 'turn Wireless debugging off and on again on the phone',
  connecting: 'keep Wireless debugging on and the phone on this Wi-Fi',
};

function fail(title, details) {
  const [bold, reset] = process.stderr.isTTY
    ? ['\x1b[1;31m', '\x1b[0m']
    : ['', ''];
  console.error(`\n${bold}✖ ${title}${reset}\n`);
  for (const line of details) {
    console.error(line ? `  ${line}` : '');
  }
  console.error('');
  process.exit(1);
}

function resolveAndroidSdk() {
  const configured = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const sdk = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'Library/Android/sdk'),
    join(homedir(), 'Android/Sdk'),
    '/opt/homebrew/share/android-commandlinetools',
  ].find((path) => path && existsSync(join(path, 'platform-tools', 'adb')));

  if (!sdk) {
    fail('No Android SDK with platform-tools was found.', [
      'Install it with Android Studio, or with Homebrew:',
      '  brew install --cask android-commandlinetools',
      '  sdkmanager "platform-tools"',
      'Then set ANDROID_HOME to the SDK folder and run pnpm run dev again.',
    ]);
  }

  if (configured && configured !== sdk) {
    console.warn(
      `› ANDROID_HOME is ${configured}, which has no platform-tools; using ${sdk}`
    );
  }

  return sdk;
}

function lanAddress() {
  return Object.values(networkInterfaces())
    .flat()
    .find((address) => address?.family === 'IPv4' && !address.internal)
    ?.address;
}

function createAdb(sdk) {
  const adbPath = join(sdk, 'platform-tools', 'adb');
  const adb = (...args) =>
    spawnSync(adbPath, args, { encoding: 'utf8', timeout: 15_000 }).stdout ??
    '';

  const listPhones = () =>
    adb('devices', '-l')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('List of devices'))
      .map((line) => line.split(/\s+/))
      .filter(([serial]) => !serial.startsWith('emulator-'))
      .filter(([serial]) =>
        process.env.ANDROID_SERIAL
          ? serial === process.env.ANDROID_SERIAL
          : true
      )
      .map(([serial, state, ...details]) => ({
        serial,
        state,
        model: details
          .find((detail) => detail.startsWith('model:'))
          ?.slice('model:'.length),
      }));

  return { adb, adbPath, listPhones };
}

async function waitForPhones(listPhones, milliseconds) {
  const deadline = Date.now() + milliseconds;
  for (;;) {
    const phones = listPhones();
    if (
      phones.some((phone) => phone.state === 'device') ||
      Date.now() >= deadline
    ) {
      return phones;
    }
    await sleep(500);
  }
}

async function resolvePhone(sdk) {
  const { adb, adbPath, listPhones } = createAdb(sdk);
  adb('start-server');

  // adb auto-connects paired phones it discovers over mDNS; give it a moment,
  // then connect any advertised wireless-debugging endpoint ourselves.
  let phones = await waitForPhones(listPhones, 5_000);
  if (!phones.some((phone) => phone.state === 'device')) {
    for (const line of adb('mdns', 'services').split('\n')) {
      if (line.includes('_adb-tls-connect._tcp')) {
        adb('connect', line.trim().split(/\s+/).at(-1));
      }
    }
    phones = await waitForPhones(listPhones, 5_000);
  }

  const ready = phones.filter((phone) => phone.state === 'device');
  if (ready.length === 1) {
    return ready[0];
  }

  if (ready.length > 1) {
    fail('Several Android phones are connected.', [
      ...ready.map((phone) => `${phone.model} (${phone.serial})`),
      '',
      'Choose one: ANDROID_SERIAL=<serial> pnpm run dev',
    ]);
  }

  const address = lanAddress();
  fail('No Android phone is connected, so the dev build stopped.', [
    ...phones.map(
      (phone) =>
        `${phone.serial} is ${phone.state}: ${stateHints[phone.state] ?? 'reconnect it'}.`
    ),
    ...(process.env.ANDROID_SERIAL
      ? [
          `ANDROID_SERIAL is ${process.env.ANDROID_SERIAL}; unset it to use any phone.`,
        ]
      : []),
    ...(phones.length > 0 || process.env.ANDROID_SERIAL ? [''] : []),
    'On the phone: Settings → System → Developer options → Wireless debugging → On.',
    `Keep it on the same Wi-Fi as this computer${address ? ` (${address})` : ''}.`,
    'First time on this computer: tap "Pair device with pairing code", then run',
    `  ${adbPath} pair <IP:port> <code>`,
    'Connect with the "IP address & port" shown on the Wireless debugging screen:',
    `  ${adbPath} connect <IP:port>`,
    'Then run pnpm run dev again.',
  ]);
}

async function assertMetroPortFree() {
  const inUse = await new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.listen(metroPort, () => server.close(() => resolve(false)));
  });
  if (!inUse) {
    return;
  }

  const owner = spawnSync(
    'lsof',
    ['-nP', `-iTCP:${metroPort}`, '-sTCP:LISTEN'],
    { encoding: 'utf8' }
  ).stdout?.trim();
  fail(`Port ${metroPort} is already in use, probably by another Metro.`, [
    ...(owner ? [...owner.split('\n'), ''] : []),
    "The phone would load that server's JavaScript instead of this checkout's.",
    'Stop it, then run pnpm run dev again:',
    `  lsof -ti tcp:${metroPort} | xargs kill`,
  ]);
}

// android/ is generated and gitignored, so regenerate it whenever the native
// fingerprint (app config, plugins, native dependencies) no longer matches.
async function ensureNativeProject(env) {
  const { createFingerprintAsync } = createRequire(import.meta.url)(
    'expo/fingerprint'
  );
  const { hash } = await createFingerprintAsync(projectRoot, {
    platforms: ['android'],
    silent: true,
  });
  const stamp = existsSync(fingerprintStampPath)
    ? readFileSync(fingerprintStampPath, 'utf8').trim()
    : undefined;
  if (stamp === hash) {
    return;
  }

  console.log(
    '› Native config changed since android/ was generated; regenerating it'
  );
  const prebuild = spawnSync(
    expoBin,
    ['prebuild', '--platform', 'android', '--clean', '--no-install'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...env, EXPO_NO_GIT_STATUS: '1' },
    }
  );
  if (prebuild.status !== 0) {
    fail('expo prebuild failed; the native project was not regenerated.', [
      'Fix the error above, then run pnpm run dev again.',
    ]);
  }
  writeFileSync(fingerprintStampPath, `${hash}\n`);
}

const sdk = resolveAndroidSdk();
const phone = await resolvePhone(sdk);
await assertMetroPortFree();
console.log(`› Android phone: ${phone.model} (${phone.serial})`);

if (!checkOnly) {
  const env = {
    ...process.env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    ANDROID_SERIAL: phone.serial,
  };
  await ensureNativeProject(env);

  const expo = spawn(
    expoBin,
    ['run:android', '--device', phone.model, '--port', String(metroPort)],
    { cwd: projectRoot, stdio: 'inherit', env }
  );
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => expo.kill(signal));
  }
  expo.on('exit', (code) => process.exit(code ?? 1));
}
