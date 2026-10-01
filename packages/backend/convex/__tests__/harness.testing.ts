import { convexTest, type TestConvex } from 'convex-test';

import schema from '../schema';

export const modules = import.meta.glob([
  '../**/*.ts',
  '../_generated/*.js',
  '!../**/*.d.ts',
  '!../__tests__/**',
  '!../betterAuth/**',
  '!../convex.config.ts',
]);

/** An in-memory backend with the real schema and every app function. */
export type TestBackend = TestConvex<typeof schema>;

/** A fresh in-memory backend with the real schema and every app function. */
export function createTest(): TestBackend {
  return convexTest(schema, modules);
}
