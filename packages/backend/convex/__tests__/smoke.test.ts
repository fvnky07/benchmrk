import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';

const modules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../_generated/*.js',
  { eager: true }
);

test('convex test harness runs', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    expect(ctx.db).toBeDefined();
  });
});
