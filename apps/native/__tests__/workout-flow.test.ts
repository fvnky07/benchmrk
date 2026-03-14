/// <reference types="jest" />

import {
  buildWorkoutExercisePayload,
  canContinueFromConfiguration,
  canContinueFromSelection,
} from '@/lib/workout';

describe('workout flow logic', () => {
  it('allows selection step to continue with valid name and selected exercises', () => {
    expect(
      canContinueFromSelection('Push Day A', ['exercise-1', 'exercise-2'])
    ).toBe(true);
  });

  it('blocks selection step when title or exercises are missing', () => {
    expect(canContinueFromSelection('', ['exercise-1'])).toBe(false);
    expect(canContinueFromSelection('Push Day A', [])).toBe(false);
  });

  it('allows configuration step when all selected exercises have valid config', () => {
    expect(
      canContinueFromConfiguration(['exercise-1', 'exercise-2'], {
        'exercise-1': { sets: 3, reps: 10, weight: 20 },
        'exercise-2': { sets: 4, reps: 8, weight: 40 },
      })
    ).toBe(true);
  });

  it('blocks configuration step for invalid values', () => {
    expect(
      canContinueFromConfiguration(['exercise-1'], {
        'exercise-1': { sets: 0, reps: 10, weight: 20 },
      })
    ).toBe(false);

    expect(
      canContinueFromConfiguration(['exercise-1'], {
        'exercise-1': { sets: 3, reps: 10, weight: -5 },
      })
    ).toBe(false);
  });

  it('builds workout payload in selected order with per-exercise values', () => {
    expect(
      buildWorkoutExercisePayload(['exercise-2', 'exercise-1'], {
        'exercise-1': { sets: 3, reps: 10, weight: 25 },
        'exercise-2': { sets: 5, reps: 5, weight: 100 },
      })
    ).toEqual([
      { exerciseId: 'exercise-2', sets: 5, reps: 5, weight: 100 },
      { exerciseId: 'exercise-1', sets: 3, reps: 10, weight: 25 },
    ]);
  });

  it('falls back to default config when one has not been edited yet', () => {
    expect(buildWorkoutExercisePayload(['exercise-1'], {})).toEqual([
      { exerciseId: 'exercise-1', sets: 3, reps: 10, weight: 0 },
    ]);
  });
});
