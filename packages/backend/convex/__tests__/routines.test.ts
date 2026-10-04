import { describe, expect, test } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { createTest, type TestBackend } from './harness.testing';

const POUND_IN_KG = 0.45359237;

async function seededMember(subject = 'member-a') {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  return { t, member: t.withIdentity({ subject }) };
}

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

describe('Routines', () => {
  test('a member can build as many Routines as they like and only sees their own', async () => {
    const { t, member } = await seededMember();
    const other = t.withIdentity({ subject: 'member-b' });

    for (const name of ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Full']) {
      await member.mutation(api.routines.create, { name });
    }
    const otherRoutine = await other.mutation(api.routines.create, {
      name: 'Push',
    });

    const mine = await member.query(api.routines.list, {});
    expect(mine.map((routine) => routine.name).sort()).toEqual([
      'Full',
      'Lower A',
      'Lower B',
      'Upper A',
      'Upper B',
    ]);
    expect(
      await member.query(api.routines.get, { routineId: otherRoutine })
    ).toBeNull();
    await expect(
      member.mutation(api.routines.rename, {
        routineId: otherRoutine,
        name: 'Mine now',
      })
    ).rejects.toThrow('ROUTINE_NOT_FOUND');
  });

  test('a Routine needs a name', async () => {
    const { member } = await seededMember();

    await expect(
      member.mutation(api.routines.create, { name: '  ' })
    ).rejects.toThrow('EMPTY_ROUTINE_NAME');
  });

  test('an added Exercise starts with 3 Sets, a 6–10 Rep range and its equipment step', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });

    await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'bench-press'),
    });
    await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'dumbbell-curl'),
    });

    const routine = await member.query(api.routines.get, { routineId });
    expect(routine?.exercises).toMatchObject([
      {
        name: 'Bench Press',
        targetSets: 3,
        repRangeMin: 6,
        repRangeMax: 10,
        stepKg: 2.5,
        setRepTargets: [],
      },
      { name: 'Dumbbell Curl', stepKg: 1 },
    ]);
  });

  test('a member training in pounds gets the step in pounds', async () => {
    const { t, member } = await seededMember();
    await member.mutation(api.memberSettings.update, { units: 'lb' });
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });

    await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'leg-press'),
    });

    const routine = await member.query(api.routines.get, { routineId });
    expect(routine?.exercises[0]?.stepKg).toBeCloseTo(10 * POUND_IN_KG, 9);
  });

  test('another member’s custom Exercise cannot be added', async () => {
    const { t, member } = await seededMember();
    const other = t.withIdentity({ subject: 'member-b' });
    const { exerciseId: secret } = await other.mutation(
      api.exercises.createCustom,
      { name: 'Secret Press', type: 'strength', equipment: 'barbell' }
    );
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });

    await expect(
      member.mutation(api.routines.addExercise, {
        routineId,
        exerciseId: secret,
      })
    ).rejects.toThrow('EXERCISE_NOT_FOUND');
  });

  test('a Rep range must run from a lower to an upper bound', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'squat'),
    });

    await expect(
      member.mutation(api.routines.updateExercise, {
        routineExerciseId,
        repRangeMin: 8,
        repRangeMax: 4,
      })
    ).rejects.toThrow('INVALID_REP_RANGE');
    await expect(
      member.mutation(api.routines.updateExercise, {
        routineExerciseId,
        repRangeMin: 0,
      })
    ).rejects.toThrow('INVALID_REP_RANGE');

    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      repRangeMin: 4,
      repRangeMax: 8,
    });
    const routine = await member.query(api.routines.get, { routineId });
    expect(routine?.exercises[0]).toMatchObject({
      repRangeMin: 4,
      repRangeMax: 8,
    });
  });

  test('target Sets accept the maximum of 20 and reject larger allocations', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      targetSets: 20,
    });
    for (const targetSets of [21, 10_000_000]) {
      await expect(
        member.mutation(api.routines.updateExercise, {
          routineExerciseId,
          targetSets,
        })
      ).rejects.toThrow('INVALID_TARGET_SETS');
    }
    expect(
      (await member.query(api.routines.get, { routineId }))?.exercises[0]
        ?.targetSets
    ).toBe(20);
  });

  test('per-Set targets never outnumber the target Sets', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'squat'),
    });

    await expect(
      member.mutation(api.routines.updateExercise, {
        routineExerciseId,
        setRepTargets: [8, 8, 7, 6],
      })
    ).rejects.toThrow('TOO_MANY_SET_TARGETS');

    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      setRepTargets: [8, 7, 6],
      startingWeightKg: 60,
    });
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      targetSets: 2,
    });

    const routine = await member.query(api.routines.get, { routineId });
    expect(routine?.exercises[0]).toMatchObject({
      targetSets: 2,
      setRepTargets: [8, 7],
      startingWeightKg: 60,
    });
  });

  test('planned rest falls back to the member’s default rest', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    const restOf = async () =>
      (await member.query(api.routines.get, { routineId }))?.exercises[0];

    expect(await restOf()).toMatchObject({
      plannedRestSeconds: null,
      restSeconds: 60,
    });

    await member.mutation(api.memberSettings.update, {
      defaultRestSeconds: 120,
    });
    expect(await restOf()).toMatchObject({ restSeconds: 120 });

    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      plannedRestSeconds: 180,
    });
    expect(await restOf()).toMatchObject({
      plannedRestSeconds: 180,
      restSeconds: 180,
    });
  });

  test('Exercises can be reordered and removed, and deleting a Routine removes it', async () => {
    const { t, member } = await seededMember();
    const routineId = await member.mutation(api.routines.create, {
      name: 'Upper A',
    });
    for (const slug of ['bench-press', 'bent-over-row', 'overhead-press']) {
      await member.mutation(api.routines.addExercise, {
        routineId,
        exerciseId: await exerciseId(t, slug),
      });
    }
    const names = async () =>
      (await member.query(api.routines.get, { routineId }))?.exercises.map(
        (exercise) => exercise.name
      );
    const before = await member.query(api.routines.get, { routineId });

    await member.mutation(api.routines.moveExercise, {
      routineExerciseId: before?.exercises[2]?._id as Id<'routineExercises'>,
      toIndex: 0,
    });
    expect(await names()).toEqual([
      'Overhead Press',
      'Bench Press',
      'Bent-over Row',
    ]);

    await member.mutation(api.routines.removeExercise, {
      routineExerciseId: before?.exercises[0]?._id as Id<'routineExercises'>,
    });
    expect(await names()).toEqual(['Overhead Press', 'Bent-over Row']);
    expect(await member.query(api.routines.list, {})).toMatchObject([
      { _id: routineId, exerciseCount: 2 },
    ]);

    await member.mutation(api.routines.setTargetDuration, {
      routineId,
      targetDurationSeconds: 3600,
    });
    expect(
      (await member.query(api.routines.get, { routineId }))
        ?.targetDurationSeconds
    ).toBe(3600);

    await member.mutation(api.routines.remove, { routineId });
    expect(await member.query(api.routines.get, { routineId })).toBeNull();
    expect(await member.query(api.routines.list, {})).toEqual([]);
  });
});
