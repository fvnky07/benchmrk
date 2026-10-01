import { expect, test } from 'vitest';

import { api } from '../_generated/api';
import { createTest, type TestBackend } from './harness.testing';

async function seedExercise(t: TestBackend) {
  return t.run(async (ctx) => {
    return ctx.db.insert('exercises', {
      slug: 'test-exercise',
      name: 'Test Exercise',
      description: 'A test exercise',
    });
  });
}

test('authenticated user can post and retrieve a comment', async () => {
  const t = createTest();
  const authed = t.withIdentity({ subject: 'user-123' });

  const exerciseId = await seedExercise(t);

  await authed.mutation(api.exerciseComments.addComment, {
    exerciseId,
    body: 'Great exercise!',
  });

  const comments = await authed.query(api.exerciseComments.listComments, {
    exerciseId,
  });

  expect(comments).toHaveLength(1);
  expect(comments[0]?.userId).toBe('user-123');
  expect(comments[0]?.body).toBe('Great exercise!');
  expect(typeof comments[0]?.createdAt).toBe('number');
});

test('empty body is rejected with EMPTY_COMMENT error', async () => {
  const t = createTest();
  const authed = t.withIdentity({ subject: 'user-456' });

  const exerciseId = await seedExercise(t);

  await expect(
    authed.mutation(api.exerciseComments.addComment, {
      exerciseId,
      body: '   ',
    })
  ).rejects.toThrow('EMPTY_COMMENT');
});

test('unauthenticated post is rejected', async () => {
  const t = createTest();

  const exerciseId = await seedExercise(t);

  await expect(
    t.mutation(api.exerciseComments.addComment, {
      exerciseId,
      body: 'Should fail',
    })
  ).rejects.toThrow('Not authenticated');
});
