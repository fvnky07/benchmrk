import type { FunctionReturnType } from 'convex/server';
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

type ActiveExercise = NonNullable<
  FunctionReturnType<typeof api.workouts.getActive>
>['exercises'][number];

type LoggedSet = {
  weightKg?: number;
  reps: number;
  rpe?: number;
  type?: 'failure' | 'warmup' | 'dropset';
};

/** Logged against targets of 60 × 8 and 60 × 7: a Stalled Workout. */
const MISS: LoggedSet[] = [
  { weightKg: 60, reps: 7, rpe: 8 },
  { weightKg: 60, reps: 6, rpe: 8 },
];

let clock = START;
function tick() {
  clock += 60 * 60 * 1000;
  vi.setSystemTime(clock);
}

/** A member with one Routine: one Exercise, 2 Sets, Rep range 4–8. */
async function routineFor(
  slug = 'bench-press',
  { units }: { units?: 'kg' | 'lb' } = {}
) {
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
    exerciseId: await exerciseId(t, slug),
  });
  await member.mutation(api.routines.updateExercise, {
    routineExerciseId,
    targetSets: 2,
    repRangeMin: 4,
    repRangeMax: 8,
  });
  return { t, member, routineId, routineExerciseId };
}

async function firstExercise(member: TestMember) {
  const exercise = (await activeWorkout(member)).exercises[0];
  if (!exercise) throw new Error('no Exercise');
  return exercise;
}

/** Starts the next Workout of the Routine. */
async function startNext(member: TestMember, routineId: Id<'routines'>) {
  tick();
  const workoutId = await member.mutation(api.workouts.start, { routineId });
  return { workoutId, exercise: await firstExercise(member) };
}

/** Logs these Sets on the active Workout's first Exercise, then ends it. */
async function logAndEnd(
  member: TestMember,
  workoutId: Id<'workouts'>,
  sets: LoggedSet[]
) {
  const exercise = await firstExercise(member);
  const working = sets.filter((set) => set.type !== 'warmup');
  for (let index = exercise.sets.length; index < working.length; index += 1) {
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: exercise._id,
    });
  }
  for (const _warmup of sets.filter((set) => set.type === 'warmup')) {
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: exercise._id,
      type: 'warmup',
    });
  }
  const rows = (await firstExercise(member)).sets;
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
      reps: set.reps,
      ...(set.weightKg !== undefined && { weightKg: set.weightKg }),
      ...(set.type && set.type !== 'warmup' && { type: set.type }),
      ...(set.rpe !== undefined && {
        effort: { scale: 'RPE' as const, value: set.rpe },
      }),
    });
  }
  await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
}

/** One whole Workout of the Routine with these Sets. */
async function logWorkout(
  member: TestMember,
  routineId: Id<'routines'>,
  sets: LoggedSet[]
) {
  const { workoutId } = await startNext(member, routineId);
  await logAndEnd(member, workoutId, sets);
}

function targetsOf(exercise: Pick<ActiveExercise, 'sets'>) {
  return exercise.sets.map((set) => set.target);
}

describe('Overload targets', () => {
  test('each Set aims for its own last reps + 1, capped at the top of the range', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
    expect(exercise.overload?.reason).toBe('rep-progression');
  });

  test('weight goes up one step when every Working Set hit the top at RPE 9 or lower; unrated Sets pass with a flag', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 9 },
      { weightKg: 60, reps: 8 },
    ]);

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
    expect(exercise.overload).toMatchObject({
      reason: 'weight-increase',
      effortNotChecked: true,
    });
  });

  test('an RPE 9.5 Set blocks the increase', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 9.5 },
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
    expect(exercise.overload?.effortBlocked).toBe(true);
  });

  test('warm-up and dropset Sets are ignored', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 20, reps: 5, type: 'warmup' },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 40, reps: 3, type: 'dropset' },
    ]);

    expect(targetsOf((await startNext(member, routineId)).exercise)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
  });

  test('an extra Set never blocks progression, and fewer Working Sets than planned hold the weight', async () => {
    const extra = await routineFor();
    await logWorkout(extra.member, extra.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 3, rpe: 10 },
    ]);
    const withExtra = await startNext(extra.member, extra.routineId);
    expect(targetsOf(withExtra.exercise).slice(0, 2)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);

    const fewer = await routineFor();
    await logWorkout(fewer.member, fewer.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);
    expect(
      targetsOf((await startNext(fewer.member, fewer.routineId)).exercise)
    ).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  test('in pounds, an increase rounds to the step and stays strictly heavier', async () => {
    const { member, routineId } = await routineFor('bench-press', {
      units: 'lb',
    });
    await logWorkout(member, routineId, [
      { weightKg: toKg(101, 'lb'), reps: 8, rpe: 8 },
      { weightKg: toKg(101, 'lb'), reps: 8, rpe: 8 },
    ]);

    const [first] = targetsOf((await startNext(member, routineId)).exercise);
    expect(first?.weightKg).toBeCloseTo(toKg(105, 'lb'), 6);
  });

  test('with no history there is no target, only the Routine’s starting weight', async () => {
    const { member, routineId, routineExerciseId } = await routineFor();
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      startingWeightKg: 50,
    });

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([null, null]);
    expect(exercise.sets.map((set) => set.weightKg)).toEqual([50, 50]);
    expect(exercise.overload?.reason).toBe('baseline');
  });

  test('a Routine’s per-Set targets lead until the first completed Workout', async () => {
    const { member, routineId, routineExerciseId } = await routineFor();
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      startingWeightKg: 50,
      setRepTargets: [8, 6],
    });

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([
      { weightKg: 50, reps: 8 },
      { weightKg: 50, reps: 6 },
    ]);
    expect(exercise.overload?.reason).toBe('routine-target');
  });

  test('an added Exercise gets targets from its own history, and a swap replaces them', async () => {
    const { t, member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);
    tick();
    const workoutId = await member.mutation(api.workouts.start, {});
    const added = await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    expect(targetsOf(await firstExercise(member))).toEqual([null, null, null]);

    await member.mutation(api.workoutStructure.swapExercise, {
      workoutExerciseId: added,
      exerciseId: await exerciseId(t, 'bench-press'),
    });

    expect(targetsOf(await firstExercise(member))).toEqual([
      { weightKg: 60, reps: 9 },
      { weightKg: 60, reps: 7 },
      { weightKg: 60, reps: 7 },
    ]);
  });

  test('timed and cardio Exercises get no targets, only the previous Set', async () => {
    const { t, member } = await routineFor();
    const plankId = await exerciseId(t, 'plank');
    const workoutWithPlank = async () => {
      tick();
      const workoutId = await member.mutation(api.workouts.start, {});
      await member.mutation(api.workouts.addExercise, {
        workoutId,
        exerciseId: plankId,
      });
      return { workoutId, plank: await firstExercise(member) };
    };
    const first = await workoutWithPlank();
    for (const [index, set] of first.plank.sets.entries()) {
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        durationSeconds: 60 + index * 15,
      });
    }
    await member.mutation(api.workouts.end, {
      workoutId: first.workoutId,
      reason: 'terminate',
    });

    const { plank } = await workoutWithPlank();

    expect(targetsOf(plank)).toEqual([null, null, null]);
    expect(plank.overload).toBeNull();
    expect(plank.sets.map((set) => set.previous?.durationSeconds)).toEqual([
      60, 75, 90,
    ]);
  });
});

describe('Overload edge cases', () => {
  test('below the range after an increase holds the weight at the bottom of the range; a second miss suggests a smaller jump', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);
    await logWorkout(member, routineId, [
      { weightKg: 62.5, reps: 3, rpe: 10 },
      { weightKg: 62.5, reps: 4, rpe: 10 },
    ]);

    const hold = await startNext(member, routineId);
    expect(targetsOf(hold.exercise)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
    expect(hold.exercise.overload?.reason).toBe('hold-below-range');

    await logAndEnd(member, hold.workoutId, [
      { weightKg: 62.5, reps: 3, rpe: 10 },
      { weightKg: 62.5, reps: 3, rpe: 10 },
    ]);
    const jump = await startNext(member, routineId);
    expect(targetsOf(jump.exercise)).toEqual([
      { weightKg: 61.25, reps: 4 },
      { weightKg: 61.25, reps: 4 },
    ]);
    expect(jump.exercise.overload?.reason).toBe('smaller-jump');
  });

  test('the smaller jump is floored to the smallest increment; with nothing left the weight keeps holding', async () => {
    const { member, routineId } = await routineFor();
    await member.mutation(api.memberSettings.update, {
      smallestIncrementKg: 2.5,
    });
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 8, rpe: 8 },
    ]);
    await logWorkout(member, routineId, [{ weightKg: 62.5, reps: 3 }]);
    await logWorkout(member, routineId, [{ weightKg: 62.5, reps: 3 }]);

    const { exercise } = await startNext(member, routineId);

    expect(targetsOf(exercise)).toEqual([
      { weightKg: 62.5, reps: 4 },
      { weightKg: 62.5, reps: 4 },
    ]);
    expect(exercise.overload?.reason).toBe('hold-below-range');
  });

  test('abandoned Workouts and skipped Exercises are not exposures', async () => {
    const { t, member, routineId } = await routineFor();
    await logWorkout(member, routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);
    const abandoned = await startNext(member, routineId);
    await member.mutation(api.workouts.end, {
      workoutId: abandoned.workoutId,
      reason: 'terminate',
    });
    const skipped = await startNext(member, routineId);
    await member.mutation(api.workouts.completeSet, {
      setId: skipped.exercise.sets[0]?._id as Id<'sets'>,
      weightKg: 40,
      reps: 2,
    });
    await member.mutation(api.workoutStructure.setSkipped, {
      workoutExerciseId: skipped.exercise._id,
      skipped: true,
    });
    await member.mutation(api.workouts.addExercise, {
      workoutId: skipped.workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    await member.mutation(api.workouts.end, {
      workoutId: skipped.workoutId,
      reason: 'terminate',
    });

    expect(targetsOf((await startNext(member, routineId)).exercise)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
  });

  test('a Plateau is flagged after exactly three consecutive Stalled Workouts', async () => {
    const { member, routineId } = await routineFor();
    await logWorkout(member, routineId, MISS);
    await logWorkout(member, routineId, MISS);
    await logWorkout(member, routineId, MISS);

    const afterTwo = await startNext(member, routineId);
    expect(afterTwo.exercise.overload?.plateau).toBe(false);
    await logAndEnd(member, afterTwo.workoutId, MISS);

    const afterThree = await startNext(member, routineId);
    expect(afterThree.exercise.overload?.plateau).toBe(true);
    expect(targetsOf(afterThree.exercise)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
  });

  test('a dismissed Plateau stays hidden until a newer Workout with the Exercise completes', async () => {
    const { member, routineId } = await routineFor();
    for (let workout = 0; workout < 4; workout += 1) {
      await logWorkout(member, routineId, MISS);
    }
    const flagged = await startNext(member, routineId);
    await member.mutation(api.overload.dismissPlateau, {
      workoutExerciseId: flagged.exercise._id,
    });
    expect((await firstExercise(member)).overload?.plateau).toBe(false);
    await member.mutation(api.workouts.end, {
      workoutId: flagged.workoutId,
      reason: 'terminate',
    });

    const unchanged = await startNext(member, routineId);
    expect(unchanged.exercise.overload?.plateau).toBe(false);
    await logAndEnd(member, unchanged.workoutId, MISS);

    expect(
      (await startNext(member, routineId)).exercise.overload?.plateau
    ).toBe(true);
  });

  test.each([
    [
      'declined',
      (member: TestMember, exercise: ActiveExercise) =>
        member.mutation(api.overload.declineTargets, {
          workoutExerciseId: exercise._id,
        }),
    ],
    [
      'edited',
      (member: TestMember, exercise: ActiveExercise) =>
        member.mutation(api.overload.editTarget, {
          workoutExerciseId: exercise._id,
          weightKg: 60,
          reps: 8,
        }),
    ],
  ])(
    'a Workout whose target was %s is never a Stalled Workout',
    async (_, override) => {
      const { member, routineId } = await routineFor();
      await logWorkout(member, routineId, MISS);
      await logWorkout(member, routineId, MISS);
      await logWorkout(member, routineId, MISS);
      const overridden = await startNext(member, routineId);
      await override(member, overridden.exercise);
      await logAndEnd(member, overridden.workoutId, MISS);

      expect(
        (await startNext(member, routineId)).exercise.overload?.plateau
      ).toBe(false);
    }
  );

  test('a Rep range change keeps the weight, clamps the reps and never counts as a stall', async () => {
    const { member, routineId, routineExerciseId } = await routineFor();
    await logWorkout(member, routineId, MISS);
    await logWorkout(member, routineId, MISS);
    await logWorkout(member, routineId, MISS);
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      repRangeMin: 10,
      repRangeMax: 12,
    });

    const changed = await startNext(member, routineId);
    expect(targetsOf(changed.exercise)).toEqual([
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 10 },
    ]);
    expect(changed.exercise.overload).toMatchObject({
      reason: 'rep-progression',
      repRangeChanged: true,
    });
    await logAndEnd(member, changed.workoutId, MISS);

    expect(
      (await startNext(member, routineId)).exercise.overload?.plateau
    ).toBe(false);
  });

  test('bodyweight progresses reps, then suggests added load once the range is maxed', async () => {
    const { member, routineId } = await routineFor('pull-up');
    await logWorkout(member, routineId, [
      { reps: 8, rpe: 8 },
      { reps: 6, rpe: 8 },
    ]);
    const reps = await startNext(member, routineId);
    expect(targetsOf(reps.exercise)).toEqual([
      { weightKg: null, reps: 8 },
      { weightKg: null, reps: 7 },
    ]);
    await logAndEnd(member, reps.workoutId, [
      { reps: 8, rpe: 8 },
      { reps: 8, rpe: 8 },
    ]);

    const load = await startNext(member, routineId);
    expect(targetsOf(load.exercise)).toEqual([
      { weightKg: 2.5, reps: 4 },
      { weightKg: 2.5, reps: 4 },
    ]);
    expect(load.exercise.overload?.reason).toBe('weight-increase');
  });
});

describe('target sheet', () => {
  async function workoutWithTargets() {
    const fixture = await routineFor();
    await logWorkout(fixture.member, fixture.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6 },
    ]);
    const next = await startNext(fixture.member, fixture.routineId);
    return { ...fixture, ...next };
  }

  test('shows Last time, Suggested next and Why from the history and the saved target', async () => {
    const { member, exercise } = await workoutWithTargets();

    const sheet = await member.query(api.overload.targetSheet, {
      workoutExerciseId: exercise._id,
    });

    expect(sheet).toMatchObject({
      exerciseName: 'Bench Press',
      repRange: { min: 4, max: 8 },
      lastTime: [
        { weightKg: 60, reps: 8, rpe: 8 },
        { weightKg: 60, reps: 6, rpe: null },
      ],
      suggested: [
        { weightKg: 60, reps: 8 },
        { weightKg: 60, reps: 7 },
      ],
      basis: {
        reason: 'rep-progression',
        effortNotChecked: true,
        effortBlocked: false,
        plateau: false,
        edited: false,
        declined: false,
      },
      targetsOn: true,
      exerciseTargetsOn: true,
    });
  });

  test('a field set then explicitly cleared stays empty when completing the Set', async () => {
    const { member, exercise } = await workoutWithTargets();
    const setId = exercise.sets[0]?._id as Id<'sets'>;
    await member.mutation(api.workouts.fillFromTarget, { setId });
    await member.mutation(api.workouts.updateSet, { setId, weightKg: 70 });
    await member.mutation(api.workouts.updateSet, { setId, weightKg: null });
    expect((await firstExercise(member)).sets[0]).toMatchObject({
      weightKg: null,
      reps: 8,
      fromTarget: { weight: false, reps: true },
    });
    await member.mutation(api.workouts.completeSet, { setId, weightKg: null });
    expect((await firstExercise(member)).sets[0]).toMatchObject({
      weightKg: null,
      reps: 8,
      fromTarget: { weight: false, reps: true },
    });
  });

  test('declining clears the targets and the values they filled, for this Workout only', async () => {
    const { member, routineId, workoutId, exercise } =
      await workoutWithTargets();
    await member.mutation(api.workouts.fillFromTargets, {
      workoutExerciseId: exercise._id,
    });

    await member.mutation(api.overload.declineTargets, {
      workoutExerciseId: exercise._id,
    });

    const declined = await firstExercise(member);
    expect(
      declined.sets.map(({ target, weightKg, reps }) => ({
        target,
        weightKg,
        reps,
      }))
    ).toEqual([
      { target: null, weightKg: null, reps: null },
      { target: null, weightKg: null, reps: null },
    ]);
    expect(declined.overload?.declined).toBe(true);

    await logAndEnd(member, workoutId, [{ weightKg: 60, reps: 8 }]);
    expect(targetsOf((await startNext(member, routineId)).exercise)).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  test('editing sets the member’s own target, and values filled from the old one follow it', async () => {
    const { member, exercise } = await workoutWithTargets();
    await member.mutation(api.workouts.fillFromTarget, {
      setId: exercise.sets[0]?._id as Id<'sets'>,
    });

    await member.mutation(api.overload.editTarget, {
      workoutExerciseId: exercise._id,
      weightKg: 65,
      reps: 6,
    });

    const edited = await firstExercise(member);
    expect(targetsOf(edited)).toEqual([
      { weightKg: 65, reps: 6 },
      { weightKg: 65, reps: 6 },
    ]);
    expect(edited.sets[0]).toMatchObject({
      weightKg: 65,
      reps: 6,
      fromTarget: { weight: true, reps: true },
    });
    expect(edited.overload?.edited).toBe(true);
  });

  test('the target editor follows the first unlogged Set across repeated edits', async () => {
    const { member, exercise } = await workoutWithTargets();
    await member.mutation(api.workouts.completeSet, {
      setId: exercise.sets[0]?._id as Id<'sets'>,
    });
    const sheet = () =>
      member.query(api.overload.targetSheet, {
        workoutExerciseId: exercise._id,
      });
    expect((await sheet()).editingTarget).toEqual({ weightKg: 60, reps: 7 });
    await member.mutation(api.overload.editTarget, {
      workoutExerciseId: exercise._id,
      weightKg: 62.5,
      reps: 7,
    });
    expect((await sheet()).editingTarget).toEqual({ weightKg: 62.5, reps: 7 });
    await member.mutation(api.overload.editTarget, {
      workoutExerciseId: exercise._id,
      weightKg: 65,
      reps: 7,
    });
    expect((await sheet()).editingTarget).toEqual({ weightKg: 65, reps: 7 });
    expect(targetsOf(await firstExercise(member))).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 65, reps: 7 },
    ]);
  });

  test('switching targets off for the Exercise stops computing and showing them; back on resumes from history', async () => {
    const { member, routineId, workoutId, exercise } =
      await workoutWithTargets();

    await member.mutation(api.overload.setTargetsEnabled, {
      exerciseId: exercise.exerciseId,
      enabled: false,
    });
    expect(targetsOf(await firstExercise(member))).toEqual([null, null]);
    await logAndEnd(member, workoutId, [
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
    const off = await startNext(member, routineId);
    expect(targetsOf(off.exercise)).toEqual([null, null]);
    expect(off.exercise.overload).toBeNull();

    await member.mutation(api.overload.setTargetsEnabled, {
      exerciseId: exercise.exerciseId,
      enabled: true,
    });

    expect(targetsOf(await firstExercise(member))).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
  });

  test('the global switch turns targets off everywhere and back on', async () => {
    const { member } = await workoutWithTargets();

    await member.mutation(api.overload.setTargetsEnabled, { enabled: false });
    expect(targetsOf(await firstExercise(member))).toEqual([null, null]);
    expect(
      (await member.query(api.memberSettings.get, {}))?.overloadTargets
    ).toBe(false);

    await member.mutation(api.overload.setTargetsEnabled, { enabled: true });
    expect(targetsOf(await firstExercise(member))).toEqual([
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
  });
});

describe('logging from targets', () => {
  async function workoutWithTargets() {
    const fixture = await routineFor();
    await logWorkout(fixture.member, fixture.routineId, [
      { weightKg: 60, reps: 8, rpe: 8 },
      { weightKg: 60, reps: 6, rpe: 8 },
    ]);
    return startNext(fixture.member, fixture.routineId).then((next) => ({
      ...fixture,
      ...next,
    }));
  }

  test('completing an untouched Set logs its target, marked as from the target', async () => {
    const { member, exercise } = await workoutWithTargets();

    const result = await member.mutation(api.workouts.completeSet, {
      setId: exercise.sets[0]?._id as Id<'sets'>,
    });

    expect(result.targetMet).toBe(true);
    expect((await firstExercise(member)).sets[0]).toMatchObject({
      weightKg: 60,
      reps: 8,
      fromTarget: { weight: true, reps: true },
    });
  });

  test('editing a field clears only that field’s provenance', async () => {
    const { member, exercise } = await workoutWithTargets();
    const second = exercise.sets[1]?._id as Id<'sets'>;
    await member.mutation(api.workouts.fillFromTarget, { setId: second });

    await member.mutation(api.workouts.updateSet, { setId: second, reps: 6 });
    const result = await member.mutation(api.workouts.completeSet, {
      setId: second,
    });

    expect(result.targetMet).toBe(false);
    expect((await firstExercise(member)).sets[1]).toMatchObject({
      weightKg: 60,
      reps: 6,
      fromTarget: { weight: true, reps: false },
    });
  });

  test('the wand fills every empty Set of the Exercise from its targets', async () => {
    const { member, exercise } = await workoutWithTargets();

    await member.mutation(api.workouts.fillFromTargets, {
      workoutExerciseId: exercise._id,
    });

    expect(
      (await firstExercise(member)).sets.map(
        ({ weightKg, reps, completedAt }) => ({ weightKg, reps, completedAt })
      )
    ).toEqual([
      { weightKg: 60, reps: 8, completedAt: null },
      { weightKg: 60, reps: 7, completedAt: null },
    ]);
  });
});
