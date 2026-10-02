import {
  BottomSheet,
  Button,
  Column,
  ListItem,
  Row,
  ScrollView,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useEffect, useState } from 'react';

import { NativeTextField } from '@/components/native/native-text-field';
import {
  errorCode,
  parseWeightKg,
  parseWholeNumber,
  weightInUnit,
} from '@/lib/workout/format';

export type RoutineExercise = NonNullable<
  FunctionReturnType<typeof api.routines.get>
>['exercises'][number];

const ERROR_COPY: Record<string, string> = {
  INVALID_TARGET_SETS: 'Target Sets must be a whole number from 1 to 20.',
  INVALID_REP_RANGE:
    'The Rep range needs whole numbers, with the lower bound at least 1 and no higher than the upper bound.',
  TOO_MANY_SET_TARGETS: 'There are more per-Set targets than target Sets.',
  INVALID_SET_TARGET: 'Per-Set targets must be whole numbers of at least 1.',
  INVALID_STEP: 'The step must be more than 0.',
  INVALID_WEIGHT: 'The starting weight can’t be negative.',
  INVALID_PLANNED_REST: 'Planned rest must be a whole number of seconds.',
};

type RoutineExerciseEditorProps = {
  routineExercise: RoutineExercise | null;
  position: number;
  exerciseCount: number;
  units: WeightUnit;
  onDismiss: () => void;
};

/** Edits one Exercise of a Routine: Sets, Rep range, targets, step and rest. */
export function RoutineExerciseEditor({
  routineExercise,
  position,
  exerciseCount,
  units,
  onDismiss,
}: Readonly<RoutineExerciseEditorProps>) {
  const updateExercise = useMutation(api.routines.updateExercise);
  const moveExercise = useMutation(api.routines.moveExercise);
  const removeExercise = useMutation(api.routines.removeExercise);
  const [targetSets, setTargetSets] = useState('');
  const [repRangeMin, setRepRangeMin] = useState('');
  const [repRangeMax, setRepRangeMax] = useState('');
  const [setTargets, setSetTargets] = useState<string[]>([]);
  const [startingWeight, setStartingWeight] = useState('');
  const [step, setStep] = useState('');
  const [plannedRest, setPlannedRest] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!routineExercise) return;
    setTargetSets(String(routineExercise.targetSets));
    setRepRangeMin(String(routineExercise.repRangeMin));
    setRepRangeMax(String(routineExercise.repRangeMax));
    setSetTargets(routineExercise.setRepTargets.map(String));
    setStartingWeight(
      routineExercise.startingWeightKg === null
        ? ''
        : String(weightInUnit(routineExercise.startingWeightKg, units))
    );
    setStep(String(weightInUnit(routineExercise.stepKg, units)));
    setPlannedRest(
      routineExercise.plannedRestSeconds === null
        ? ''
        : String(routineExercise.plannedRestSeconds)
    );
    setErrorMessage(null);
  }, [routineExercise, units]);

  if (!routineExercise) {
    return <BottomSheet isPresented={false} onDismiss={onDismiss} />;
  }

  const id: Id<'routineExercises'> = routineExercise._id;
  const tracksLoad =
    routineExercise.type === 'strength' ||
    routineExercise.type === 'bodyweight';
  const parsedSetCount = parseWholeNumber(targetSets) ?? 0;
  const setCount = Math.min(parsedSetCount, 20);

  const run = async (action: () => Promise<unknown>) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await action();
      onDismiss();
    } catch (error) {
      setErrorMessage(
        ERROR_COPY[errorCode(error) ?? ''] ??
          'Could not save this Exercise. Try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const save = () => {
    const parsedSetTargets = setTargets
      .slice(0, setCount)
      .map(parseWholeNumber);
    const lastGiven = parsedSetTargets.findLastIndex((reps) => reps !== null);
    if (
      parsedSetTargets.slice(0, lastGiven + 1).some((reps) => reps === null)
    ) {
      setErrorMessage(
        'Per-Set targets apply from Set 1 onwards. Fill the earlier Sets first.'
      );
      return;
    }
    const startingWeightKg = startingWeight.trim()
      ? parseWeightKg(startingWeight, units)
      : null;
    const stepKg = parseWeightKg(step, units);
    const rest = plannedRest.trim() ? parseWholeNumber(plannedRest) : null;
    if (
      (startingWeight.trim() && startingWeightKg === null) ||
      stepKg === null ||
      (plannedRest.trim() && rest === null)
    ) {
      setErrorMessage('Enter numbers for weight, step and rest.');
      return;
    }

    const parsedTargetSets = parseWholeNumber(targetSets);
    const parsedMin = parseWholeNumber(repRangeMin);
    const parsedMax = parseWholeNumber(repRangeMax);
    if (
      parsedTargetSets === null ||
      parsedTargetSets < 1 ||
      parsedTargetSets > 20
    ) {
      setErrorMessage(ERROR_COPY.INVALID_TARGET_SETS ?? null);
      return;
    }
    if (parsedMin === null || parsedMax === null) {
      setErrorMessage(ERROR_COPY.INVALID_REP_RANGE ?? null);
      return;
    }

    run(() =>
      updateExercise({
        routineExerciseId: id,
        targetSets: parsedTargetSets,
        repRangeMin: parsedMin,
        repRangeMax: parsedMax,
        setRepTargets: parsedSetTargets.slice(0, lastGiven + 1) as number[],
        startingWeightKg,
        stepKg,
        plannedRestSeconds: rest,
      })
    );
  };

  return (
    <BottomSheet isPresented onDismiss={onDismiss} snapPoints={['full']}>
      <ScrollView>
        <Column spacing={12}>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            {routineExercise.name}
          </Text>
          <NativeTextField
            label="Target Sets"
            keyboardType="number-pad"
            value={targetSets}
            onChangeText={setTargetSets}
          />
          <Row spacing={12}>
            <NativeTextField
              label="Rep range from"
              keyboardType="number-pad"
              value={repRangeMin}
              onChangeText={setRepRangeMin}
            />
            <NativeTextField
              label="to"
              keyboardType="number-pad"
              value={repRangeMax}
              onChangeText={setRepRangeMax}
            />
          </Row>
          {tracksLoad ? (
            <>
              <ListItem supportingText="Optional. Your first Workout starts from these until it becomes your baseline.">
                Per-Set rep targets
              </ListItem>
              {Array.from({ length: setCount }, (_, index) => (
                <NativeTextField
                  // biome-ignore lint/suspicious/noArrayIndexKey: one field per Set position
                  key={index}
                  label={`Set ${index + 1}`}
                  keyboardType="number-pad"
                  placeholder="No target"
                  value={setTargets[index] ?? ''}
                  onChangeText={(text) =>
                    setSetTargets((current) => {
                      const next = [...current];
                      next[index] = text;
                      return next;
                    })
                  }
                />
              ))}
              <NativeTextField
                label={`Starting weight (${units})`}
                keyboardType="decimal-pad"
                placeholder="None"
                value={startingWeight}
                onChangeText={setStartingWeight}
              />
              <NativeTextField
                label={`Weight step (${units})`}
                keyboardType="decimal-pad"
                value={step}
                onChangeText={setStep}
              />
            </>
          ) : null}
          <NativeTextField
            label="Planned rest (seconds)"
            keyboardType="number-pad"
            placeholder={`Default (${routineExercise.restSeconds} s)`}
            value={plannedRest}
            onChangeText={setPlannedRest}
          />
          {errorMessage ? (
            <ListItem supportingText={errorMessage}>Can’t save yet</ListItem>
          ) : null}
          <Button
            disabled={isSaving}
            label={isSaving ? 'Saving…' : 'Save'}
            onPress={save}
          />
          <Row spacing={12}>
            <Button
              disabled={isSaving || position === 0}
              label="Move up"
              variant="outlined"
              onPress={() =>
                run(() =>
                  moveExercise({ routineExerciseId: id, toIndex: position - 1 })
                )
              }
            />
            <Button
              disabled={isSaving || position === exerciseCount - 1}
              label="Move down"
              variant="outlined"
              onPress={() =>
                run(() =>
                  moveExercise({ routineExerciseId: id, toIndex: position + 1 })
                )
              }
            />
          </Row>
          <Button
            disabled={isSaving}
            label="Remove from Routine"
            variant="text"
            onPress={() => run(() => removeExercise({ routineExerciseId: id }))}
          />
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
