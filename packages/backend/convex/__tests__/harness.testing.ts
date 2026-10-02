import {
  convexTest,
  type TestConvex,
  type TestConvexForDataModel,
} from 'convex-test';

import { api, components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import betterAuthSchema from '../betterAuth/schema';
import schema from '../schema';

export const modules = import.meta.glob([
  '../**/*.ts',
  '../_generated/*.js',
  '!../**/*.d.ts',
  '!../__tests__/**',
  '!../betterAuth/**',
  '!../convex.config.ts',
]);

const betterAuthModules = import.meta.glob([
  '../betterAuth/**/*.ts',
  '!../betterAuth/convex.config.ts',
]);

/** An in-memory backend with the real schema and every app function. */
export type TestBackend = TestConvex<typeof schema>;

/** The backend as seen by one signed-in Benchmrk identity. */
export type TestMember = TestConvexForDataModel<DataModel>;

/**
 * A fresh in-memory backend with the real schema, every app function and the
 * local Better Auth component, so identities are real component records.
 */
export function createTest(): TestBackend {
  const t = convexTest(schema, modules);
  t.registerComponent('betterAuth', betterAuthSchema, betterAuthModules);
  return t;
}

/** Creates a Better Auth identity and returns its id (the `subject` of its sessions). */
export async function createAuthIdentity(
  t: TestBackend,
  identity: { email: string; emailVerified: boolean; name?: string }
): Promise<string> {
  const now = Date.now();
  const created = (await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: 'user',
      data: {
        name: identity.name ?? identity.email,
        email: identity.email,
        emailVerified: identity.emailVerified,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };
  return created._id;
}

/**
 * A signed-in member with a username, who has a verified email unless told
 * otherwise.
 */
export async function verifiedMember(
  t: TestBackend,
  username: string,
  { verified = true }: { verified?: boolean } = {}
): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: verified,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}
