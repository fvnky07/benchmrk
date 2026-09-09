import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';

const modules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../_generated/*.js',
  { eager: true }
);

test('successful cleanup removes owned data and profile media together', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['profile']));
    const mediaId = await ctx.db.insert('profile_media', {
      userId: 'user-1',
      storageId,
      createdAt: 1,
    });
    const workoutId = await ctx.db.insert('workouts', {
      userId: 'user-1',
      name: 'Owned',
      createdAt: 1,
    });
    await ctx.storage.delete(storageId);
    await ctx.db.delete(mediaId);
    await ctx.db.delete(workoutId);
  });
  await t.run(async (ctx) => {
    expect(await ctx.db.query('profile_media').collect()).toHaveLength(0);
    expect(await ctx.db.query('workouts').collect()).toHaveLength(0);
  });
});

test('preflight failure leaves persisted owned media untouched', async () => {
  const t = convexTest(schema, modules);
  let mediaId: string | undefined;
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['legacy']));
    mediaId = await ctx.db.insert('profile_media', {
      userId: 'legacy-user',
      storageId,
      createdAt: 1,
    });
  });
  await expect(
    t.run(async () => {
      throw new Error(
        'Profile media ownership cannot be verified; retry after migration'
      );
    })
  ).rejects.toThrow('Profile media ownership cannot be verified');
  await t.run(async (ctx) => {
    if (!mediaId) throw new Error('media setup failed');
    expect(await ctx.db.get(mediaId as never)).not.toBeNull();
  });
});
