import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { createTest, type TestMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function twoMembers() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  return {
    t,
    memberA: t.withIdentity({ subject: 'member-a' }),
    memberB: t.withIdentity({ subject: 'member-b' }),
    benchId: await exerciseId(t, 'bench-press'),
    cableRowId: await exerciseId(t, 'cable-row'),
  };
}

/** Starts an empty Workout with these Exercises added. */
async function workoutWith(member: TestMember, exerciseIds: Id<'exercises'>[]) {
  const workoutId = await member.mutation(api.workouts.start, {});
  for (const id of exerciseIds) {
    await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: id,
    });
  }
  return { workoutId, workout: await activeWorkout(member) };
}

async function end(member: TestMember, workoutId: Id<'workouts'>) {
  await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
}

describe('notes', () => {
  test('each note has exactly one target, and a target has one note', async () => {
    const { memberA, benchId } = await twoMembers();
    const { workout } = await workoutWith(memberA, [benchId]);
    const setId = workout.exercises[0]?.sets[0]?._id as Id<'sets'>;

    await expect(
      memberA.mutation(api.notes.save, {
        target: { kind: 'set', setId, exerciseId: benchId } as never,
        text: 'two targets',
      })
    ).rejects.toThrow();

    await memberA.mutation(api.notes.save, {
      target: { kind: 'set', setId },
      text: 'Left shoulder pinched',
    });
    await memberA.mutation(api.notes.save, {
      target: { kind: 'set', setId },
      text: 'Left shoulder fine after warm-up',
    });
    await memberA.mutation(api.notes.save, {
      target: { kind: 'workout', workoutId: workout._id },
      text: 'Deload week',
    });

    const noted = await activeWorkout(memberA);
    expect(noted.exercises[0]?.sets.map((set) => set.note)).toEqual([
      'Left shoulder fine after warm-up',
      null,
      null,
    ]);
    expect(noted.note).toBe('Deload week');
  });

  test('a standing Exercise note appears in every later Workout with the Exercise', async () => {
    const { memberA, benchId, cableRowId } = await twoMembers();
    const first = await workoutWith(memberA, [benchId]);
    await memberA.mutation(api.notes.save, {
      target: { kind: 'exercise', exerciseId: benchId },
      text: 'Keep elbows tucked',
    });
    await memberA.mutation(api.workouts.completeSet, {
      setId: first.workout.exercises[0]?.sets[0]?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });
    await end(memberA, first.workoutId);

    const later = await workoutWith(memberA, [cableRowId, benchId]);

    expect(later.workout.exercises.map((item) => item.standingNote)).toEqual([
      null,
      'Keep elbows tucked',
    ]);
    expect(later.workout.note).toBeNull();
  });

  test('notes are visible only to their owner', async () => {
    const { memberA, memberB, benchId } = await twoMembers();
    const { workout } = await workoutWith(memberA, [benchId]);
    await memberA.mutation(api.notes.save, {
      target: { kind: 'exercise', exerciseId: benchId },
      text: 'Keep elbows tucked',
    });

    await expect(
      memberB.mutation(api.notes.save, {
        target: {
          kind: 'set',
          setId: workout.exercises[0]?.sets[0]?._id as Id<'sets'>,
        },
        text: 'not mine',
      })
    ).rejects.toThrow();
    const theirs = await workoutWith(memberB, [benchId]);
    expect(theirs.workout.exercises[0]?.standingNote).toBeNull();
  });

  test('empty text removes a note, and a deleted Set takes its note with it', async () => {
    const { t, memberA, benchId } = await twoMembers();
    const { workout } = await workoutWith(memberA, [benchId]);
    const [first, second] = workout.exercises[0]?.sets ?? [];
    for (const set of [first, second]) {
      await memberA.mutation(api.notes.save, {
        target: { kind: 'set', setId: set?._id as Id<'sets'> },
        text: 'note',
      });
    }

    await memberA.mutation(api.notes.save, {
      target: { kind: 'set', setId: first?._id as Id<'sets'> },
      text: '  ',
    });
    await memberA.mutation(api.workouts.deleteSet, {
      setId: second?._id as Id<'sets'>,
    });

    expect(await t.run((ctx) => ctx.db.query('notes').collect())).toEqual([]);
  });
});

describe('Machine setup', () => {
  test('one per member per Exercise, shown in every Workout with it', async () => {
    const { memberA, cableRowId } = await twoMembers();
    await memberA.mutation(api.machineSetups.save, {
      exerciseId: cableRowId,
      positions: { seat: 4, pin: 7 },
      custom: [],
    });
    await memberA.mutation(api.machineSetups.save, {
      exerciseId: cableRowId,
      positions: { seat: 5, back: 2 },
      custom: [{ label: 'Handle', value: 'V-bar' }],
    });

    const { workoutId, workout } = await workoutWith(memberA, [cableRowId]);
    await memberA.mutation(api.workouts.completeSet, {
      setId: workout.exercises[0]?.sets[0]?._id as Id<'sets'>,
      weightKg: 40,
      reps: 10,
    });
    await end(memberA, workoutId);
    const later = await workoutWith(memberA, [cableRowId]);

    for (const shown of [workout, later.workout]) {
      expect(shown.exercises[0]?.machineSetup).toEqual({
        positions: { seat: 5, back: 2 },
        custom: [{ label: 'Handle', value: 'V-bar' }],
      });
    }
  });

  test('belongs to its owner only', async () => {
    const { memberA, memberB, cableRowId } = await twoMembers();
    await memberA.mutation(api.machineSetups.save, {
      exerciseId: cableRowId,
      positions: { seat: 4 },
      custom: [],
    });

    const theirs = await workoutWith(memberB, [cableRowId]);

    expect(theirs.workout.exercises[0]?.machineSetup).toBeNull();
  });

  test('is refused for Exercises that are not machine or cable', async () => {
    const { memberA, benchId } = await twoMembers();

    await expect(
      memberA.mutation(api.machineSetups.save, {
        exerciseId: benchId,
        positions: { angle: 30 },
        custom: [],
      })
    ).rejects.toThrow('MACHINE_SETUP_NOT_SUPPORTED');
  });
});
