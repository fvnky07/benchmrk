import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';

const START = new Date('2026-10-01T08:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

async function exerciseId(t: TestBackend, slug: string) {
  const exercise = await t.run((ctx) =>
    ctx.db
      .query('exercises')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
  );
  if (!exercise) throw new Error(`missing ${slug}`);
  return exercise._id as Id<'exercises'>;
}

async function memberWithRoutine() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const member = t.withIdentity({ subject: 'member-a' });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Upper A',
  });
  const benchId = await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await member.mutation(api.routines.updateExercise, {
    routineExerciseId: benchId,
    targetSets: 2,
  });
  await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bent-over-row'),
  });
  return { t, member, routineId };
}

async function activeWorkout(member: TestMember) {
  const workout = await member.query(api.workouts.getActive, {});
  if (!workout) throw new Error('no active Workout');
  return workout;
}

describe('Workout lifecycle', () => {
  test('starting from a Routine creates its Exercises and planned Sets', async () => {
    const { member, routineId } = await memberWithRoutine();

    await member.mutation(api.workouts.start, { routineId });

    const workout = await activeWorkout(member);
    expect(workout).toMatchObject({
      name: 'Upper A',
      startedAt: START,
      progress: { done: 0, total: 5 },
    });
    expect(
      workout.exercises.map((exercise) => [exercise.name, exercise.sets.length])
    ).toEqual([
      ['Bench Press', 2],
      ['Bent-over Row', 3],
    ]);
  });

  test('only one Workout can be active at a time', async () => {
    const { member, routineId } = await memberWithRoutine();
    await member.mutation(api.workouts.start, { routineId });

    await expect(member.mutation(api.workouts.start, {})).rejects.toThrow(
      'ACTIVE_WORKOUT_EXISTS'
    );
  });

  test('an empty Workout starts without Exercises and grows as Exercises are added', async () => {
    const { t, member } = await memberWithRoutine();
    await member.mutation(api.workouts.start, {});

    const empty = await activeWorkout(member);
    expect(empty).toMatchObject({
      name: 'Workout',
      exercises: [],
      progress: { done: 0, total: 0 },
    });

    await member.mutation(api.workouts.addExercise, {
      workoutId: empty._id,
      exerciseId: await exerciseId(t, 'squat'),
    });
    const workout = await activeWorkout(member);
    expect(workout.exercises).toMatchObject([
      { name: 'Squat', sets: [{}, {}, {}] },
    ]);

    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: workout.exercises[0]?._id as Id<'workoutExercises'>,
    });
    expect((await activeWorkout(member)).progress).toEqual({
      done: 0,
      total: 4,
    });
  });

  test('completing a Set records a server time, its values and progress', async () => {
    const { member, routineId } = await memberWithRoutine();
    await member.mutation(api.workouts.start, { routineId });
    const firstSet = (await activeWorkout(member)).exercises[0]?.sets[0];

    vi.setSystemTime(START + 90_000);
    await member.mutation(api.workouts.completeSet, {
      setId: firstSet?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });

    const workout = await activeWorkout(member);
    expect(workout.exercises[0]?.sets[0]).toMatchObject({
      weightKg: 60,
      reps: 8,
      completedAt: START + 90_000,
    });
    expect(workout.progress).toEqual({ done: 1, total: 5 });

    await member.mutation(api.workouts.uncompleteSet, {
      setId: firstSet?._id as Id<'sets'>,
    });
    expect((await activeWorkout(member)).progress).toEqual({
      done: 0,
      total: 5,
    });
  });

  test('Terminate keeps logged Sets and ends at the last completed Set', async () => {
    const { member, routineId } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const firstSet = (await activeWorkout(member)).exercises[0]?.sets[0];
    vi.setSystemTime(START + 120_000);
    await member.mutation(api.workouts.completeSet, {
      setId: firstSet?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });

    vi.setSystemTime(START + 3_600_000);
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    expect(await member.query(api.workouts.getActive, {})).toBeNull();
    expect(await member.query(api.workouts.get, { workoutId })).toMatchObject({
      status: 'completed',
      finishReason: 'terminated_early',
      finishedAt: START + 120_000,
      progress: { done: 1, total: 5 },
    });
  });

  test('a Workout ended with nothing logged is abandoned', async () => {
    const { member, routineId } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });

    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    expect(await member.query(api.workouts.get, { workoutId })).toMatchObject({
      status: 'abandoned',
    });
  });

  test('Finish needs every planned Set done', async () => {
    const { member, routineId } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });

    await expect(
      member.mutation(api.workouts.end, { workoutId, reason: 'finish' })
    ).rejects.toThrow('NOT_ALL_SETS_DONE');

    let at = START;
    for (const exercise of (await activeWorkout(member)).exercises) {
      for (const set of exercise.sets) {
        at += 60_000;
        vi.setSystemTime(at);
        await member.mutation(api.workouts.completeSet, {
          setId: set._id,
          weightKg: 50,
          reps: 10,
        });
      }
    }
    await member.mutation(api.workouts.end, { workoutId, reason: 'finish' });

    expect(await member.query(api.workouts.get, { workoutId })).toMatchObject({
      status: 'completed',
      finishReason: 'all_sets_done',
      finishedAt: at,
    });
  });

  test('the end time can be edited but never before the start', async () => {
    const { member, routineId } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const firstSet = (await activeWorkout(member)).exercises[0]?.sets[0];
    vi.setSystemTime(START + 60_000);
    await member.mutation(api.workouts.completeSet, {
      setId: firstSet?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });
    vi.setSystemTime(START + 600_000);
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    await expect(
      member.mutation(api.workouts.setEndTime, {
        workoutId,
        finishedAt: START - 1,
      })
    ).rejects.toThrow('INVALID_END_TIME');

    await member.mutation(api.workouts.setEndTime, {
      workoutId,
      finishedAt: START + 300_000,
    });
    expect(
      (await member.query(api.workouts.get, { workoutId }))?.finishedAt
    ).toBe(START + 300_000);
  });

  test('another member can neither see nor change a Workout', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const other = t.withIdentity({ subject: 'member-b' });
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const firstSet = (await activeWorkout(member)).exercises[0]?.sets[0];

    expect(await other.query(api.workouts.get, { workoutId })).toBeNull();
    expect(await other.query(api.workouts.getActive, {})).toBeNull();
    await expect(
      other.mutation(api.workouts.completeSet, {
        setId: firstSet?._id as Id<'sets'>,
        weightKg: 1,
        reps: 1,
      })
    ).rejects.toThrow('SET_NOT_FOUND');
    await expect(
      other.mutation(api.workouts.end, { workoutId, reason: 'terminate' })
    ).rejects.toThrow('WORKOUT_NOT_FOUND');
  });
});
