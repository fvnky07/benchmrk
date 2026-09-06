import { Button, ListItem } from '@expo/ui';
import { useState } from 'react';

import type { SessionExercise, SessionSet } from '@/lib/convex/session-api';

import { NativeSetRow, type NativeSetMetrics } from './native-set-row';

type NativeActiveExerciseCardProps = {
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onLogSet: (setId: string, metrics: NativeSetMetrics) => void;
  onRemoveExercise: () => void;
  sessionExercise: SessionExercise;
  sets: SessionSet[];
  weightUnit: 'kg' | 'lbs';
};

export function NativeActiveExerciseCard({
  onAddSet,
  onDeleteSet,
  onLogSet,
  onRemoveExercise,
  sessionExercise,
  sets,
  weightUnit,
}: Readonly<NativeActiveExerciseCardProps>) {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const exercise = sessionExercise.exercise;
  const exerciseName = exercise?.name ?? 'Unknown exercise';
  const exerciseType = exercise?.exerciseType;

  return (
    <>
      <ListItem supportingText={exercise?.description ?? ''}>
        {exerciseName}
      </ListItem>
      <Button label="Add set" variant="outlined" onPress={onAddSet} />
      {sets.length === 0 ? (
        <ListItem supportingText="Add a set to begin tracking this exercise.">
          No sets yet
        </ListItem>
      ) : (
        sets.map((set) => (
          <NativeSetRow
            key={set._id}
            distanceMeters={set.distanceMeters}
            durationSeconds={set.durationSeconds}
            exerciseType={exerciseType}
            isCompleted={set.isCompleted}
            onDelete={() => onDeleteSet(set._id)}
            onLog={(metrics) => onLogSet(set._id, metrics)}
            reps={set.reps}
            setNumber={set.setNumber}
            weightKg={set.weightKg}
            weightUnit={weightUnit}
          />
        ))
      )}
      {isConfirmingRemoval ? (
        <>
          <ListItem supportingText="All session sets for this exercise will be removed.">
            Remove exercise?
          </ListItem>
          <Button label="Remove exercise" onPress={onRemoveExercise} />
          <Button
            label="Cancel"
            variant="outlined"
            onPress={() => setIsConfirmingRemoval(false)}
          />
        </>
      ) : (
        <Button
          label="Remove exercise"
          variant="text"
          onPress={() => setIsConfirmingRemoval(true)}
        />
      )}
    </>
  );
}
