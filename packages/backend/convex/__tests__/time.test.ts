import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { createTest, type TestMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

const at = (seconds: number) => vi.setSystemTime(START + seconds * 1000);

/** "Legs": Squat × 2 then Cable Row × 1, 60 s default rest. */
async function legsRoutine() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const member = t.withIdentity({ subject: 'member-a' });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Legs',
  });
  for (const [slug, targetSets] of [
    ['squat', 2],
    ['cable-row', 1],
  ] as const) {
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, slug),
    });
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      targetSets,
    });
  }
  return { t, member, routineId };
}

async function setIds(member: TestMember) {
  const [squat, row] = (await activeWorkout(member)).exercises;
  const ids = [...(squat?.sets ?? []), ...(row?.sets ?? [])].map(
    (set) => set._id
  );
  return ids as Id<'sets'>[];
}

const log = (member: TestMember, setId: Id<'sets'>) =>
  member.mutation(api.workouts.completeSet, { setId, weightKg: 50, reps: 5 });

describe('time tracking', () => {
  test('rest before the same Exercise, transition before another; measurement starts at the first logged Set', async () => {
    const { member, routineId } = await legsRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [squat1, squat2, row1] = await setIds(member);

    at(120);
    await member.mutation(api.workouts.touchSet, {
      setId: squat1 as Id<'sets'>,
    });
    at(150);
    await log(member, squat1 as Id<'sets'>);
    at(220);
    await member.mutation(api.workouts.touchSet, {
      setId: squat2 as Id<'sets'>,
    });
    at(250);
    await log(member, squat2 as Id<'sets'>);
    at(350);
    await log(member, row1 as Id<'sets'>);

    const workout = await member.query(api.workouts.get, { workoutId });
    expect(workout?.time).toEqual({
      workingSeconds: 30 + 30 + 40,
      restSeconds: 70,
      transitionSeconds: 60,
      adherence: { actualSeconds: 70, plannedSeconds: 60 },
    });
  });

  test('within Alternating sets the gap between block Exercises is rest', async () => {
    const { member, routineId } = await legsRoutine();
    const routine = await member.query(api.routines.get, { routineId });
    await member.mutation(api.routines.linkExercises, {
      routineExerciseId: routine?.exercises[1]?._id as Id<'routineExercises'>,
      withRoutineExerciseId: routine?.exercises[0]
        ?._id as Id<'routineExercises'>,
    });
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [squat1, , row1] = await setIds(member);

    at(100);
    await log(member, squat1 as Id<'sets'>);
    at(130);
    await member.mutation(api.workouts.touchSet, { setId: row1 as Id<'sets'> });
    at(160);
    await log(member, row1 as Id<'sets'>);

    const workout = await member.query(api.workouts.get, { workoutId });
    expect(workout?.time).toMatchObject({
      workingSeconds: 30,
      restSeconds: 30,
      transitionSeconds: 0,
    });
  });

  test('Sets logged within 10 s count in totals but not in adherence', async () => {
    const { t, member, routineId } = await legsRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [squat1, squat2] = await setIds(member);

    at(100);
    await log(member, squat1 as Id<'sets'>);
    at(105);
    await log(member, squat2 as Id<'sets'>);

    const flags = await t.run(async (ctx) =>
      (
        await ctx.db
          .query('sets')
          .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
          .collect()
      ).map((set) => set.loggedTogether ?? false)
    );
    expect(flags).toEqual([true, true, false]);
    const workout = await member.query(api.workouts.get, { workoutId });
    expect(workout?.time).toEqual({
      workingSeconds: 0,
      restSeconds: 5,
      transitionSeconds: 0,
      adherence: null,
    });
  });

  test('unchecking then relogging after 10 seconds restores rest adherence', async () => {
    const { member, routineId } = await legsRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [squat1, squat2] = await setIds(member);
    at(100);
    await log(member, squat1 as Id<'sets'>);
    at(105);
    await log(member, squat2 as Id<'sets'>);
    await member.mutation(api.workouts.uncompleteSet, {
      setId: squat2 as Id<'sets'>,
    });
    at(130);
    await log(member, squat2 as Id<'sets'>);
    expect(
      (await member.query(api.workouts.get, { workoutId }))?.time.adherence
    ).toEqual({ actualSeconds: 30, plannedSeconds: 60 });
  });

  test('target duration is the median of the last 5 completed Workouts once 3 exist, unless overridden', async () => {
    const { member, routineId } = await legsRoutine();
    let clock = 0;
    const workoutOf = async (minutes: number) => {
      at(clock);
      const workoutId = await member.mutation(api.workouts.start, {
        routineId,
      });
      const [first] = await setIds(member);
      at(clock + minutes * 60);
      await log(member, first as Id<'sets'>);
      await member.mutation(api.workouts.end, {
        workoutId,
        reason: 'terminate',
      });
      clock += 24 * 3600;
    };
    const target = async () =>
      (await member.query(api.routines.get, { routineId }))
        ?.suggestedDurationSeconds;

    await workoutOf(40);
    await workoutOf(60);
    expect(await target()).toBeNull();

    await workoutOf(50);
    expect(await target()).toBe(50 * 60);

    for (const minutes of [90, 30, 70]) await workoutOf(minutes);
    // Last 5: 60, 50, 90, 30, 70 → median 60.
    expect(await target()).toBe(60 * 60);

    await member.mutation(api.routines.setTargetDuration, {
      routineId,
      targetDurationSeconds: 45 * 60,
    });
    at(clock);
    await member.mutation(api.workouts.start, { routineId });
    expect((await activeWorkout(member)).targetDurationSeconds).toBe(45 * 60);
  });
});
