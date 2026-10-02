import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

const HOUR = 60 * 60 * 1000;
const NOTE = 'left shoulder twinge';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function member(t: TestBackend, username: string): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: true,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

/**
 * A host and a lifter in one Group. The lifter has a Bench Press Routine
 * (2 Sets, 4–8 reps) and one earlier Workout, so today's Sets carry
 * Overload targets.
 */
async function groupWithLifter() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const host = await member(t, 'host');
  const lifter = await member(t, 'lifter');
  const routineId = await lifter.mutation(api.routines.create, {
    name: 'Push',
  });
  const routineExerciseId = await lifter.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await lifter.mutation(api.routines.updateExercise, {
    routineExerciseId,
    targetSets: 2,
    repRangeMin: 4,
    repRangeMax: 8,
  });

  const earlier = await lifter.mutation(api.workouts.start, { routineId });
  for (const set of (await activeWorkout(lifter)).exercises[0]?.sets ?? []) {
    await lifter.mutation(api.workouts.completeSet, {
      setId: set._id,
      weightKg: 60,
      reps: 6,
    });
  }
  await lifter.mutation(api.workouts.end, {
    workoutId: earlier,
    reason: 'finish',
  });

  vi.setSystemTime(START + 24 * HOUR);
  await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  await lifter.mutation(api.groups.joinByCode, { code });
  await lifter.mutation(api.workouts.start, { routineId });
  const sets = (await activeWorkout(lifter)).exercises[0]?.sets ?? [];
  const [first, second] = sets;
  if (!first?.target || !second?.target) throw new Error('no targets');
  return { t, host, lifter, first, second };
}

async function lifterBox(viewer: TestMember) {
  const group = await viewer.query(api.groups.getMine, {});
  const box = group?.members.find(
    (candidate) => candidate.username === 'lifter'
  );
  if (!box) throw new Error('lifter not in the Group');
  return box;
}

async function logFirstSet(lifter: TestMember, setId: Id<'sets'>) {
  await lifter.mutation(api.workouts.completeSet, {
    setId,
    weightKg: 137.5,
    reps: 7,
    effort: { scale: 'RPE', value: 8.5 },
  });
  await lifter.mutation(api.notes.save, {
    target: { kind: 'set', setId },
    text: NOTE,
  });
}

describe('Group view', () => {
  test('hides weights, reps and volume until the member shows them', async () => {
    const { host, lifter, first } = await groupWithLifter();
    await logFirstSet(lifter, first._id);

    const hidden = await lifterBox(host);
    expect(hidden.progress.weightsShown).toBe(false);
    expect(hidden.progress.currentSet).toBeNull();
    expect(hidden.progress.volumeKg).toBeNull();
    expect(JSON.stringify(hidden)).not.toContain('137.5');

    await lifter.mutation(api.groups.setShowWeights, { shown: true });
    const shown = await lifterBox(host);
    expect(shown.progress.weightsShown).toBe(true);
    expect(shown.progress.currentSet).toEqual({ weightKg: 137.5, reps: 7 });
    expect(shown.progress.volumeKg).toBe(137.5 * 7);
    expect((await host.query(api.groups.getMine, {}))?.showWeights).toBe(false);
    expect((await lifter.query(api.groups.getMine, {}))?.showWeights).toBe(
      true
    );
  });

  test('never carries Effort ratings, notes or target values, shown or not', async () => {
    const { host, lifter, first } = await groupWithLifter();
    await logFirstSet(lifter, first._id);

    for (const shown of [false, true]) {
      await lifter.mutation(api.groups.setShowWeights, { shown });
      const box = JSON.stringify(await lifterBox(host));
      expect(box).not.toContain(NOTE);
      expect(box).not.toContain('rpe');
      expect(box).not.toContain('8.5');
      expect(box).not.toContain('target"');
    }
  });

  test('shows Set pips and target met or missed from the saved targets', async () => {
    const { host, lifter, first, second } = await groupWithLifter();
    await lifter.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 200,
      reps: 8,
    });

    let [bench] = (await lifterBox(host)).progress.exercises;
    expect(bench).toEqual({
      name: 'Bench Press',
      pips: ['done', 'current'],
      targetMet: null,
    });

    await lifter.mutation(api.workouts.completeSet, {
      setId: second._id,
      weightKg: 200,
      reps: 8,
    });
    [bench] = (await lifterBox(host)).progress.exercises;
    expect(bench?.pips).toEqual(['done', 'done']);
    expect(bench?.targetMet).toBe(true);

    await lifter.mutation(api.workouts.uncompleteSet, { setId: second._id });
    await lifter.mutation(api.workouts.completeSet, {
      setId: second._id,
      weightKg: 20,
      reps: 1,
    });
    [bench] = (await lifterBox(host)).progress.exercises;
    expect(bench?.targetMet).toBe(false);
  });

  test('showing weights needs a live Group', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const solo = await member(t, 'solo');

    await expect(
      solo.mutation(api.groups.setShowWeights, { shown: true })
    ).rejects.toThrow('NOT_IN_GROUP');
  });
});
