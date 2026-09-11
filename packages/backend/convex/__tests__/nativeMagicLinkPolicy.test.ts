import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { query } from '../_generated/server';
import {
  createMagicLinkProof,
  isAuthorizedMagicLinkRequest,
} from '../betterAuth/auth';
import {
  isEligibleNativeMagicLinkIdentity,
  normalizeNativeMagicLinkEmail,
} from '../nativeMagicLinkPolicy';
import schema from '../schema';

const rootModules = {
  ...import.meta.glob('../**/*.ts'),
  ...import.meta.glob('../_generated/*.js'),
};
const betterAuthSchema = await import('../betterAuth/schema');

function makeTest() {
  const t = convexTest(schema, rootModules);
  t.registerComponent('betterAuth', betterAuthSchema.default, {
    ...import.meta.glob('../betterAuth/**/*.ts'),
    '../betterAuth/users.ts': async () => ({
      getUserByEmail: query({
        args: { email: v.string() },
        handler: async (_ctx, args: { email: string }) => {
          if (args.email === 'eligible@example.com') {
            return { emailVerified: true, premiumUntil: Date.now() + 60_000 };
          }
          if (args.email === 'ineligible@example.com') {
            return { emailVerified: false, premiumUntil: null };
          }
          return null;
        },
      }),
    }),
  });
  return t;
}

describe('native magic-link completion policy', () => {
  test('normalizes syntactically valid email addresses', () => {
    expect(normalizeNativeMagicLinkEmail('  MEMBER@EXAMPLE.COM ')).toBe(
      'member@example.com'
    );
  });

  test.each([
    ['unknown address', null, null],
    [
      'unconfirmed waitlist identity',
      'member@example.com',
      { emailVerified: false, premiumUntil: 2_000 },
    ],
    [
      'non-premium identity',
      'member@example.com',
      { emailVerified: true, premiumUntil: null },
    ],
    [
      'waitlist-created verification session without premium',
      'member@example.com',
      { emailVerified: true },
    ],
    [
      'expired premium identity',
      'member@example.com',
      { emailVerified: true, premiumUntil: 1_000 },
    ],
  ])('%s never receives mail', (_label, waitlistEmail, user) => {
    expect(isEligibleNativeMagicLinkIdentity(waitlistEmail, user, 2_000)).toBe(
      false
    );
  });

  test('only a confirmed active-premium waitlist identity receives mail', () => {
    expect(
      isEligibleNativeMagicLinkIdentity(
        'member@example.com',
        { emailVerified: true, premiumUntil: 3_000 },
        2_000
      )
    ).toBe(true);
  });

  test('public Better Auth sends require a server-generated flow proof', async () => {
    const previousSecret = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET = 'test-secret';
    try {
      const proof = await createMagicLinkProof(
        'eligible@example.com',
        'native-login'
      );
      await expect(
        isAuthorizedMagicLinkRequest('eligible@example.com', undefined)
      ).resolves.toBe(false);
      await expect(
        isAuthorizedMagicLinkRequest('eligible@example.com', {
          flow: 'native-login',
          proof: 'not-the-proof',
        })
      ).resolves.toBe(false);
      await expect(
        isAuthorizedMagicLinkRequest('eligible@example.com', {
          flow: 'native-login',
          proof,
        })
      ).resolves.toBe(true);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.BETTER_AUTH_SECRET;
      } else {
        process.env.BETTER_AUTH_SECRET = previousSecret;
      }
    }
  });

  test('completes invalid syntax without attempting the mutation', async () => {
    const t = makeTest();
    await expect(
      t.mutation(api.waitlist.requestNativeMagicLink, { email: 'not-an-email' })
    ).rejects.toThrow('Invalid email address');
  });

  test.each([
    ['unknown@example.com', false],
    ['ineligible@example.com', true],
  ])(
    'returns generic completion without scheduling for %s',
    async (email, seed) => {
      const t = makeTest();
      if (seed) {
        await t.run(async (ctx) => {
          await ctx.db.insert('waitlist', {
            email,
            position: 1,
            createdAt: Date.now(),
          });
        });
      }
      await expect(
        t.mutation(api.waitlist.requestNativeMagicLink, { email })
      ).resolves.toEqual({ status: 'accepted' });
      await expect(
        t.run(async (ctx) =>
          ctx.db.query('native_magic_link_requests').collect()
        )
      ).resolves.toEqual([]);
    }
  );

  test('schedules one eligible request and cooldown makes retries idempotent', async () => {
    const t = makeTest();
    await t.run(async (ctx) => {
      await ctx.db.insert('waitlist', {
        email: 'eligible@example.com',
        position: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.waitlist.requestNativeMagicLink, {
        email: 'eligible@example.com',
      })
    ).resolves.toEqual({ status: 'accepted' });
    await expect(
      t.mutation(api.waitlist.requestNativeMagicLink, {
        email: 'eligible@example.com',
      })
    ).resolves.toEqual({ status: 'accepted' });

    const requests = await t.run(async (ctx) =>
      ctx.db.query('native_magic_link_requests').collect()
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].email).toBe('eligible@example.com');
  });
});
