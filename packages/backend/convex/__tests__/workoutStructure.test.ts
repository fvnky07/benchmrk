import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { TestMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  memberWithRoutine,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function started() {
  const fixture = await memberWithRoutine();
  const workoutId = await fixture.member.mutation(api.workouts.start, {
    routineId: fixture.routineId,
  });
  const workout = await activeWorkout(fixture.member);
  const [bench, row] = workout.exercises;
  if (!bench || !row) throw new Error('missing Exercises');
  return { ...fixture, workoutId, bench, row };
}

async function routineShape(member: TestMember, routineId: Id<'routines'>) {
  const routine = await member.query(api.routines.get, { routineId });
  return routine?.exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.targetSets,
    restSeconds: exercise.plannedRestSeconds,
    linkedToNext: exercise.linkedToNext,
  }));
}

describe('changing a Workout’s structure', () => {
  test('Remove and Swap are refused once an Exercise has a logged Set', async () => {
    const { t, member, bench, row } = await started();
    await member.mutation(api.workouts.completeSet, {
      setId: bench.sets[0]?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });

    await expect(
      member.mutation(api.workoutStructure.removeExercise, {
        workoutExerciseId: bench._id,
      })
    ).rejects.toThrow('EXERCISE_HAS_LOGGED_SETS');
    await expect(
      member.mutation(api.workoutStructure.swapExercise, {
        workoutExerciseId: bench._id,
        exerciseId: await exerciseId(t, 'dumbbell-bench-press'),
      })
    ).rejects.toThrow('EXERCISE_HAS_LOGGED_SETS');

    await member.mutation(api.workoutStructure.removeExercise, {
      workoutExerciseId: row._id,
    });
    expect(
      (await activeWorkout(member)).exercises.map((exercise) => exercise.name)
    ).toEqual(['Bench Press']);
  });

  test('Skip marks an Exercise skipped and its unlogged Sets stop counting', async () => {
    const { member, bench, row } = await started();
    for (const set of bench.sets) {
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 60,
        reps: 8,
      });
    }

    await member.mutation(api.workoutStructure.setSkipped, {
      workoutExerciseId: row._id,
      skipped: true,
    });

    const workout = await activeWorkout(member);
    expect(workout.exercises[1]?.skipped).toBe(true);
    expect(workout.progress).toEqual({ done: 2, total: 2 });
    await member.mutation(api.workouts.end, {
      workoutId: workout._id,
      reason: 'finish',
    });
  });

  test('changes stay in this Workout unless saved to the Routine', async () => {
    const { t, member, routineId, workoutId, bench, row } = await started();
    const before = await routineShape(member, routineId);

    await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    await member.mutation(api.workoutStructure.removeExercise, {
      workoutExerciseId: row._id,
    });
    await member.mutation(api.workouts.completeSet, {
      setId: bench.sets[0]?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    expect(await routineShape(member, routineId)).toEqual(before);
  });

  test('deleting every Set removes the Exercise from the shown and saved Routine', async () => {
    const { t, member, routineId, workoutId, bench, row } = await started();
    const addedId = await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    const added = (await activeWorkout(member)).exercises.find(
      (exercise) => exercise._id === addedId
    );
    if (!added) throw new Error('missing added Exercise');
    for (const set of [...row.sets, ...added.sets]) {
      await member.mutation(api.workouts.deleteSet, { setId: set._id });
    }
    await member.mutation(api.workouts.completeSet, {
      setId: bench.sets[0]?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    const shown = await member.query(api.workoutStructure.getChanges, {
      workoutId,
    });
    expect(shown?.changes).toEqual([
      { kind: 'removed', exercise: 'Bent-over Row' },
    ]);
    expect(shown?.after).toMatchObject([
      { name: 'Bench Press', sets: 2, restSeconds: null },
    ]);
    await member.mutation(api.workoutStructure.saveToRoutine, { workoutId });
    expect(await routineShape(member, routineId)).toEqual(shown?.after);
    expect(
      (await member.query(api.workoutStructure.getChanges, { workoutId }))
        ?.changes
    ).toEqual([]);
  });

  test('saving applies exactly the changes shown before and after', async () => {
    const { t, member, routineId, workoutId, bench, row } = await started();
    const squatId = await member.mutation(api.workouts.addExercise, {
      workoutId,
      exerciseId: await exerciseId(t, 'squat'),
    });
    await member.mutation(api.workoutStructure.moveExercise, {
      workoutExerciseId: squatId,
      toIndex: 0,
    });
    await member.mutation(api.workoutStructure.moveExercise, {
      workoutExerciseId: row._id,
      toIndex: 1,
    });
    await member.mutation(api.workoutStructure.swapExercise, {
      workoutExerciseId: row._id,
      exerciseId: await exerciseId(t, 'cable-row'),
    });
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: bench._id,
    });
    await member.mutation(api.workouts.setExerciseRest, {
      workoutExerciseId: bench._id,
      seconds: 120,
    });
    await member.mutation(api.workouts.completeSet, {
      setId: bench.sets[0]?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
    });
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    const shown = await member.query(api.workoutStructure.getChanges, {
      workoutId,
    });
    expect(shown?.changes.map((change) => change.kind).sort()).toEqual([
      'added',
      'order',
      'rest',
      'sets',
      'swapped',
    ]);
    expect(shown?.after).toEqual([
      { name: 'Squat', sets: 3, restSeconds: null, linkedToNext: false },
      { name: 'Cable Row', sets: 3, restSeconds: null, linkedToNext: false },
      { name: 'Bench Press', sets: 3, restSeconds: 120, linkedToNext: false },
    ]);

    await member.mutation(api.workoutStructure.saveToRoutine, { workoutId });

    expect(await routineShape(member, routineId)).toEqual(shown?.after);
    expect(
      (await member.query(api.workoutStructure.getChanges, { workoutId }))
        ?.changes
    ).toEqual([]);
  });
});
