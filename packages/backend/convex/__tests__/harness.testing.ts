import {
  convexTest,
  type TestConvex,
  type TestConvexForDataModel,
} from 'convex-test';

import type { DataModel } from '../_generated/dataModel';
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

/** The backend as seen by one signed-in Benchmrk identity. */
export type TestMember = TestConvexForDataModel<DataModel>;

/** A fresh in-memory backend with the real schema and every app function. */
export function createTest(): TestBackend {
  return convexTest(schema, modules);
}
