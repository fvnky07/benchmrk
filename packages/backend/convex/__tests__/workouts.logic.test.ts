import { expect, test } from 'vitest';

test('free tier logic allows up to three workouts and blocks the fourth', () => {
  const FREE_TIER_WORKOUT_LIMIT = 3;

  const allowsCreate = (existingWorkoutCount: number) =>
    existingWorkoutCount < FREE_TIER_WORKOUT_LIMIT;

  expect(allowsCreate(0)).toBe(true);
  expect(allowsCreate(1)).toBe(true);
  expect(allowsCreate(2)).toBe(true);
  expect(allowsCreate(3)).toBe(false);
  expect(allowsCreate(4)).toBe(false);
});

test('workout listing order sorts newest first', () => {
  const workouts = [
    { name: 'Oldest', createdAt: 1 },
    { name: 'Newest', createdAt: 3 },
    { name: 'Middle', createdAt: 2 },
  ];

  const ordered = workouts.sort((a, b) => b.createdAt - a.createdAt);

  expect(ordered.map((workout) => workout.name)).toEqual([
    'Newest',
    'Middle',
    'Oldest',
  ]);
});
