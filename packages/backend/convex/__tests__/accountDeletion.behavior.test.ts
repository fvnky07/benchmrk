import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import {
  assertProfileMediaOwnership,
  deleteOwnedAccountData,
  deleteOwnedAuthRecords,
} from '../auth';
import schema from '../schema';

const modules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../_generated/*.js',
  { eager: true }
);

test('cascade removes owned records and custom-exercise dependents', async () => {
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
    const sessionId = await ctx.db.insert('workoutSessions', {
      userId: 'user-1',
      name: 'Session',
      status: 'completed',
      startedAt: 1,
    });
    const exerciseId = await ctx.db.insert('exercises', {
      slug: 'custom',
      name: 'Custom',
      description: 'Owned',
      createdBy: 'user-1',
    });
    const workoutExerciseId = await ctx.db.insert('workoutExercises', {
      workoutId,
      exerciseId,
      order: 0,
      sets: 3,
      reps: 10,
      weight: 60,
    });
    const sessionExerciseId = await ctx.db.insert('sessionExercises', {
      sessionId,
      exerciseId,
      order: 0,
    });
    const sessionSetId = await ctx.db.insert('sessionSets', {
      sessionExerciseId,
      sessionId,
      setNumber: 1,
      type: 'normal',
      isCompleted: true,
    });
    const otherWorkoutId = await ctx.db.insert('workouts', {
      userId: 'user-2',
      name: 'Other',
      createdAt: 1,
    });
    const otherWorkoutExerciseId = await ctx.db.insert('workoutExercises', {
      workoutId: otherWorkoutId,
      exerciseId,
      order: 0,
      sets: 3,
      reps: 10,
      weight: 60,
    });
    const otherSessionId = await ctx.db.insert('workoutSessions', {
      userId: 'user-2',
      name: 'Other session',
      status: 'completed',
      startedAt: 1,
    });
    const otherSessionExerciseId = await ctx.db.insert('sessionExercises', {
      sessionId: otherSessionId,
      exerciseId,
      order: 0,
    });
    const otherSessionSetId = await ctx.db.insert('sessionSets', {
      sessionExerciseId: otherSessionExerciseId,
      sessionId: otherSessionId,
      setNumber: 1,
      type: 'normal',
      isCompleted: true,
    });
    const ownedCommentId = await ctx.db.insert('exerciseComments', {
      exerciseId,
      userId: 'user-1',
      body: 'Owned',
      createdAt: 1,
    });
    const dependentCommentId = await ctx.db.insert('exerciseComments', {
      exerciseId,
      userId: 'user-2',
      body: 'Dependent',
      createdAt: 1,
    });
    const preferenceId = await ctx.db.insert('user_preferences', {
      userId: 'user-1',
      theme: 'system',
      defaultRestTimer: 60,
      weightUnit: 'kg',
      autoSaveWorkouts: true,
      syncToCloud: true,
      appleHealthEnabled: false,
      stravaEnabled: false,
      createdAt: 1,
      updatedAt: 1,
    });

    await deleteOwnedAccountData(
      ctx,
      'user-1',
      [{ _id: workoutId }],
      [{ _id: sessionId }],
      [{ _id: exerciseId }],
      [{ _id: mediaId, storageId }]
    );

    for (const id of [
      workoutId,
      workoutExerciseId,
      sessionId,
      sessionExerciseId,
      sessionSetId,
      exerciseId,
      ownedCommentId,
      dependentCommentId,
      preferenceId,
      mediaId,
      otherWorkoutExerciseId,
      otherSessionExerciseId,
      otherSessionSetId,
    ]) {
      expect(await ctx.db.get(id)).toBeNull();
    }
    expect(await ctx.db.get(otherWorkoutId)).not.toBeNull();
    expect(await ctx.db.get(otherSessionId)).not.toBeNull();
    expect(await ctx.storage.getUrl(storageId)).toBeNull();
  });
});

test('actual preflight failure leaves persisted data and media untouched', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['legacy']));
    const mediaId = await ctx.db.insert('profile_media', {
      userId: 'legacy',
      storageId,
      createdAt: 1,
    });
    expect(() => assertProfileMediaOwnership('legacy-url', 0)).toThrow(
      'Profile media ownership cannot be verified'
    );
    expect(await ctx.db.get(mediaId)).not.toBeNull();
    expect(await ctx.storage.getUrl(storageId)).not.toBeNull();
  });
});

test('removes all Better Auth records owned by the account', async () => {
  const deleted: Array<{
    model: string;
    where: Array<{ field: string; value: string }>;
  }> = [];

  await deleteOwnedAuthRecords(
    {
      deleteMany: async (input) => {
        deleted.push(input);
      },
      delete: async (input) => {
        deleted.push(input);
      },
    },
    'user-1'
  );

  expect(deleted).toEqual([
    {
      model: 'session',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'account',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'twoFactor',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'passkey',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'oauthApplication',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'oauthAccessToken',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'oauthConsent',
      where: [{ field: 'userId', value: 'user-1' }],
    },
    {
      model: 'user',
      where: [{ field: 'id', value: 'user-1' }],
    },
  ]);
});
