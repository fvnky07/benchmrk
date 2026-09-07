import { Button, ListItem } from '@expo/ui';
import { useState } from 'react';

import {
  distanceKilometersToMeters,
  distanceMetersToKilometers,
} from '@/lib/workout/distance';
import { NativeTextField } from './native-text-field';

export type NativeSetMetrics = {
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
};

type NativeSetRowProps = {
  distanceMeters?: number;
  durationSeconds?: number;
  exerciseType?: 'strength' | 'bodyweight' | 'cardio' | 'timed';
  isCompleted: boolean;
  onDelete: () => void;
  onLog: (metrics: NativeSetMetrics) => void;
  reps?: number;
  setNumber: number;
  weightKg?: number;
  weightUnit: 'kg' | 'lbs';
};

export function NativeSetRow({
  distanceMeters,
  durationSeconds,
  exerciseType = 'strength',
  isCompleted,
  onDelete,
  onLog,
  reps,
  setNumber,
  weightKg,
  weightUnit,
}: Readonly<NativeSetRowProps>) {
  const [localReps, setLocalReps] = useState(reps?.toString() ?? '');
  const [localWeight, setLocalWeight] = useState(weightKg?.toString() ?? '');
  const [localDuration, setLocalDuration] = useState(
    durationSeconds?.toString() ?? ''
  );
  const [localDistance, setLocalDistance] = useState(
    distanceMeters === undefined
      ? ''
      : String(distanceMetersToKilometers(distanceMeters))
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const logSet = () => {
    const metrics: NativeSetMetrics = {};
    if (localReps) metrics.reps = Number(localReps);
    if (localWeight) metrics.weightKg = Number(localWeight);
    if (localDuration) metrics.durationSeconds = Number(localDuration);
    if (localDistance) {
      metrics.distanceMeters = distanceKilometersToMeters(
        Number(localDistance)
      );
    }
    onLog(metrics);
  };

  return (
    <>
      <ListItem supportingText={isCompleted ? 'Completed' : 'Not logged'}>
        {`Set ${setNumber}`}
      </ListItem>
      {exerciseType === 'strength' ? (
        <>
          <NativeTextField
            editable={!isCompleted}
            keyboardType="decimal-pad"
            label={`Weight (${weightUnit})`}
            onChangeText={setLocalWeight}
            value={localWeight}
          />
          <NativeTextField
            editable={!isCompleted}
            keyboardType="number-pad"
            label="Reps"
            onChangeText={setLocalReps}
            value={localReps}
          />
        </>
      ) : null}
      {exerciseType === 'bodyweight' ? (
        <NativeTextField
          editable={!isCompleted}
          keyboardType="number-pad"
          label="Reps"
          onChangeText={setLocalReps}
          value={localReps}
        />
      ) : null}
      {exerciseType === 'cardio' ? (
        <>
          <NativeTextField
            editable={!isCompleted}
            keyboardType="decimal-pad"
            label="Distance (km)"
            onChangeText={setLocalDistance}
            value={localDistance}
          />
          <NativeTextField
            editable={!isCompleted}
            keyboardType="number-pad"
            label="Duration (seconds)"
            onChangeText={setLocalDuration}
            value={localDuration}
          />
        </>
      ) : null}
      {exerciseType === 'timed' ? (
        <NativeTextField
          editable={!isCompleted}
          keyboardType="number-pad"
          label="Duration (seconds)"
          onChangeText={setLocalDuration}
          value={localDuration}
        />
      ) : null}
      <Button
        disabled={isCompleted}
        label={isCompleted ? 'Set logged' : 'Log set'}
        onPress={logSet}
      />
      {isConfirmingDelete ? (
        <>
          <ListItem supportingText="This cannot be undone.">
            Delete set?
          </ListItem>
          <Button label="Delete set" onPress={onDelete} />
          <Button
            label="Cancel"
            variant="outlined"
            onPress={() => setIsConfirmingDelete(false)}
          />
        </>
      ) : (
        <Button
          label="Delete set"
          variant="text"
          onPress={() => setIsConfirmingDelete(true)}
        />
      )}
    </>
  );
}
