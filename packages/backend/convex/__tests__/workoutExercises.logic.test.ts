import { expect, test } from 'vitest';

test('exercise configuration preserves array order as zero-indexed positions', () => {
  const exercises = [
    { exerciseId: 'exercise-1', sets: 3, reps: 10, weight: 20 },
    { exerciseId: 'exercise-2', sets: 4, reps: 8, weight: 40 },
  ];

  const withOrder = exercises.map((exercise, index) => ({
    ...exercise,
    order: index,
  }));

  expect(withOrder).toEqual([
    { exerciseId: 'exercise-1', sets: 3, reps: 10, weight: 20, order: 0 },
    { exerciseId: 'exercise-2', sets: 4, reps: 8, weight: 40, order: 1 },
  ]);
});

test('updating one exercise config leaves sibling configs unchanged', () => {
  const configs = {
    first: { sets: 3, reps: 10, weight: 20 },
    second: { sets: 4, reps: 8, weight: 40 },
  };

  const updated = {
    ...configs,
    second: { sets: 5, reps: 6, weight: 45 },
  };

  expect(updated.first).toEqual({ sets: 3, reps: 10, weight: 20 });
  expect(updated.second).toEqual({ sets: 5, reps: 6, weight: 45 });
});
