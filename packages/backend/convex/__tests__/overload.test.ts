import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { toKg } from '../domain/units';
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

type LoggedSet = {
  weightKg: number;
  reps: number;
  rpe?: number;
  type?: 'normal' | 'failure' | 'warmup' | 'dropset';
};

let clock = START;
function tick() {
  clock += 60 * 60 * 1000;
  vi.setSystemTime(clock);
}

/** A member with one Routine: Bench Press, 2 Sets, Rep range 4–8. */
async function benchRoutine({ units }: { units?: 'kg' | 'lb' } = {}) {
  clock = START;
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const member = t.withIdentity({ subject: 'member-a' });
  if (units) await member.mutation(api.memberSettings.update, { units });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Push',
  });
  const routineExerciseId = await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await member.mutation(api.routines.updateExercise, {
    routineExerciseId,
    targetSets: 2,
    repRangeMin: 4,
    repRangeMax: 8,
  });
  return { t, member, routineId, routineExerciseId };
}

/** Logs one Workout of the Routine with these Bench Press Sets, then ends it. */
async function logBench(
  member: TestMember,
  routineId: Id<'routines'>,
  sets: LoggedSet[]
) {
  tick();
  const workoutId = await member.mutation(api.workouts.start, { routineId });
  const bench = (await activeWorkout(member)).exercises[0];
  if (!bench) throw new Error('no Bench Press');
  const working = sets.filter((set) => set.type !== 'warmup');
  for (let index = bench.sets.length; index < working.length; index += 1) {
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: bench._id,
    });
  }
  for (const _warmup of sets.filter((set) => set.type === 'warmup')) {
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: bench._id,
      type: 'warmup',
    });
  }
  const rows = (await activeWorkout(member)).exercises[0]?.sets ?? [];
  const warmups = rows.filter((row) => row.type === 'warmup');
  const plannedRows = rows.filter((row) => row.type !== 'warmup');
  let warmupIndex = 0;
  let workingIndex = 0;
  for (const set of sets) {
    const row =
      set.type === 'warmup'
        ? warmups[warmupIndex++]
        : plannedRows[workingIndex++];
    await member.mutation(api.workouts.completeSet, {
      setId: row?._id as Id<'sets'>,
      weightKg: set.weightKg,
      reps: set.reps,
      ...(set.type && set.type !== 'warmup' && { type: set.type }),
      ...(set.rpe !== undefined && {
        effort: { scale: 'RPE' as const, value: set.rpe },
      }),
    });
  }
  await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
}

/** Starts the next Workout and returns Bench Press's planned Sets. */
async function nextBench(member: TestMember, routineId: Id<'routines'>) {
  tick();
  await member.mutation(api.workouts.start, { routineId });
  const bench = (await activeWorkout(member)).exercises[0];
  if (!bench) throw new Error('no Bench Press');
  return bench;
}

function targetsOf(bench: {
  sets: { target: { weightKg: number | null; reps: number } | null }[];
}) {
  return bench.sets.map((set) =>
    set.target ? { weightKg: set.target.weightKg, reps: set.target.reps } : null
  );
}

describe('Overload targets', () => {
  test('each Set aims for its own last reps + 1, capped at the top of the range', async () => {
    const { member, routineId } = await benchRoutine();
    await logBench(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);

    const bench = await nextBench(member, routineId);

    expect(targetsOf(bench)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
    expect(bench.sets[0]?.target?.reason).toBe('rep-progression');
  });

  test('weight goes up one step when every Working Set hit the top at RPE 9 or lower; unrated Sets pass with a flag', async () => {
    const { member, routineId } = await benchRoutine();
    await logBench(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 9 },
      { weightKg: 60, reps: 8 },
    ]);

    const bench = await nextBench(member, routineId);

    expect(targetsOf(bench)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
    expect(bench.sets[0]?.target).toMatchObject({
      reason: 'weight-increase',
      effortNotChecked: true,
    });
  });

  test('an RPE 9.5 Set blocks the increase', async () => {
    const { member, routineId } = await benchRoutine();
    await logBench(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 9.5 },
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);

    expect(targetsOf(await nextBench(member, routineId))).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  test('warm-up and dropset Sets are ignored', async () => {
    const { member, routineId } = await benchRoutine();
    await logBench(member, routineId, [
      { weightKg: 20, reps: 5, type: 'warmup' },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 40, reps: 3, type: 'dropset' },
    ]);

    expect(targetsOf(await nextBench(member, routineId))).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
  });

  test('an extra Set never blocks progression, and fewer Working Sets than planned hold the weight', async () => {
    const extra = await benchRoutine();
    await logBench(extra.member, extra.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 3, rpe: 10 },
    ]);
    const withExtra = await nextBench(extra.member, extra.routineId);
    expect(targetsOf(withExtra).slice(0, 2)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);

    const fewer = await benchRoutine();
    await logBench(fewer.member, fewer.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);
    expect(targetsOf(await nextBench(fewer.member, fewer.routineId))).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  test('in pounds, an increase rounds to the step and stays strictly heavier', async () => {
    const { member, routineId } = await benchRoutine({ units: 'lb' });
    await logBench(member, routineId, [
      { weightKg: toKg(101, 'lb'), reps: 8, rpe: 8 },
      { weightKg: toKg(101, 'lb'), reps: 8, rpe: 8 },
    ]);

    const [first] = targetsOf(await nextBench(member, routineId));
    expect(first?.weightKg).toBeCloseTo(toKg(105, 'lb'), 6);
  });

  test('with no history there is no target, only the Routine’s starting weight', async () => {
    const { member, routineId, routineExerciseId } = await benchRoutine();
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      startingWeightKg: 50,
    });

    const bench = await nextBench(member, routineId);

    expect(targetsOf(bench)).toEqual([null, null]);
    expect(bench.sets.map((set) => set.weightKg)).toEqual([50, 50]);
  });

  test('a Routine’s per-Set targets lead until the first completed Workout', async () => {
    const { member, routineId, routineExerciseId } = await benchRoutine();
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      startingWeightKg: 50,
      setRepTargets: [8, 6],
    });

    const bench = await nextBench(member, routineId);

    expect(targetsOf(bench)).toEqual([
      { weightKg: 50, reps: 8 },
      { weightKg: 50, reps: 6 },
    ]);
    expect(bench.sets[0]?.target?.reason).toBe('routine-target');
  });

  test('an added Exercise gets targets from its own history, and a swap replaces them', async () => {
    const { t, member, routineId } = await benchRoutine();
    await logBench(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);
    tick();
    const workoutId = await member.mutation(api.workouts.start, {});
    const added = await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    const squat = (await activeWorkout(member)).exercises[0];
    expect(squat && targetsOf(squat)).toEqual([null, null, null]);

    await member.mutation(api.workoutStructure.swapExercise, {
      workoutExerciseId: added,
      exerciseId: await exerciseId(t, 'bench-press'),
    });

    const bench = (await activeWorkout(member)).exercises[0];
    expect(bench && targetsOf(bench)).toEqual([
      { weightKg: 60, reps: 9 },
      { weightKg: 60, reps: 7 },
      { weightKg: 60, reps: 7 },
    ]);
  });

  test('timed and cardio Exercises get no targets', async () => {
    const { t, member } = await benchRoutine();
    const plankId = await exerciseId(t, 'plank');
    const workoutWithPlank = async () => {
      tick();
      const workoutId = await member.mutation(api.workouts.start, {});
      await member.mutation(api.workouts.addExercise, {
        workoutId,
        exerciseId: plankId,
      });
      const plank = (await activeWorkout(member)).exercises[0];
      if (!plank) throw new Error('no Plank');
      return { workoutId, plank };
    };
    const first = await workoutWithPlank();
    for (const set of first.plank.sets) {
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        durationSeconds: 60,
      });
    }
    await member.mutation(api.workouts.end, {
      workoutId: first.workoutId,
      reason: 'terminate',
    });

    const { plank } = await workoutWithPlank();

    expect(targetsOf(plank)).toEqual([null, null, null]);
  });
});

describe('logging from targets', () => {
  async function benchWithTargets() {
    const fixture = await benchRoutine();
    await logBench(fixture.member, fixture.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);
    const bench = await nextBench(fixture.member, fixture.routineId);
    return { ...fixture, bench };
  }

  test('completing an untouched Set logs its target, marked as from the target', async () => {
    const { member, bench } = await benchWithTargets();
    const [first] = bench.sets;

    const result = await member.mutation(api.workouts.completeSet, {
      setId: first?._id as Id<'sets'>,
    });

    expect(result.targetMet).toBe(true);
    expect((await activeWorkout(member)).exercises[0]?.sets[0]).toMatchObject({
      weightKg: 60,
      reps: 8,
      fromTarget: { weight: true, reps: true },
    });
  });

  test('editing a field clears only that field’s provenance', async () => {
    const { member, bench } = await benchWithTargets();
    const second = bench.sets[1]?._id as Id<'sets'>;
    await member.mutation(api.workouts.fillFromTarget, { setId: second });

    await member.mutation(api.workouts.updateSet, { setId: second, reps: 6 });
    const result = await member.mutation(api.workouts.completeSet, {
      setId: second,
    });

    expect(result.targetMet).toBe(false);
    expect((await activeWorkout(member)).exercises[0]?.sets[1]).toMatchObject({
      weightKg: 60,
      reps: 6,
      fromTarget: { weight: true, reps: false },
    });
  });

  test('the wand fills every empty Set of the Exercise from its targets', async () => {
    const { member, bench } = await benchWithTargets();

    await member.mutation(api.workouts.fillFromTargets, {
      workoutExerciseId: bench._id,
    });

    expect(
      (await activeWorkout(member)).exercises[0]?.sets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        completedAt: set.completedAt,
      }))
    ).toEqual([
      { weightKg: 60, reps: 8, completedAt: null },
      { weightKg: 60, reps: 7, completedAt: null },
    ]);
  });
});
