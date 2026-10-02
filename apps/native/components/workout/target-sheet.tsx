import {
  BottomSheet,
  Button,
  Column,
  Row,
  ScrollView,
  Spacer,
  Switch,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { THEME, useAppearance } from '@/lib/ui';
import { formatEffort, weightInUnit } from '@/lib/workout/format';
import {
  effortNotCheckedText,
  PLATEAU_TEXT,
  TIMED_TEXT,
  whyText,
} from '@/lib/workout/overload-copy';
import { setSummary, steppedValue, targetText } from '@/lib/workout/set-entry';

type TargetSheetProps = {
  /** The Workout Exercise whose target is explained; null when closed. */
  workoutExerciseId: Id<'workoutExercises'> | null;
  units: WeightUnit;
  effortScale: EffortScale;
  /** Called on every edit, so the Workout counts as active. */
  onActivity: () => void;
  onDismiss: () => void;
};

/**
 * Last time, Suggested next and Why for an Exercise's Overload target, with
 * edit, decline, reset, the per-Exercise switch and the Plateau flag.
 */
export function TargetSheet({
  workoutExerciseId,
  units,
  effortScale,
  onActivity,
  onDismiss,
}: Readonly<TargetSheetProps>) {
  const sheet = useQuery(
    api.overload.targetSheet,
    workoutExerciseId ? { workoutExerciseId } : 'skip'
  );
  const editTarget = useMutation(api.overload.editTarget);
  const declineTargets = useMutation(api.overload.declineTargets);
  const resetTargets = useMutation(api.overload.resetTargets);
  const setTargetsEnabled = useMutation(api.overload.setTargetsEnabled);
  const dismissPlateau = useMutation(api.overload.dismissPlateau);
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    onActivity();
    try {
      setErrorMessage(null);
      await action();
    } catch {
      setErrorMessage(failure);
    }
  };

  const label = (text: string) => (
    <Text textStyle={{ fontSize: 13, color: colors.mutedForeground }}>
      {text}
    </Text>
  );

  const body = () => {
    if (!sheet || !workoutExerciseId) {
      return <Text textStyle={{ fontSize: 17 }}>Loading target…</Text>;
    }
    const { repRange, basis, lastTime, suggested } = sheet;
    const targeted =
      sheet.exerciseType === 'strength' || sheet.exerciseType === 'bodyweight';
    const unrated = lastTime?.filter((set) => set.rpe === null).length ?? 0;
    const current = sheet.editingTarget ?? {
      weightKg: lastTime?.[0]?.weightKg ?? null,
      reps: repRange.min,
    };
    const edit = (change: { weightKg?: number | null; reps?: number }) =>
      run(
        () =>
          editTarget({
            workoutExerciseId,
            weightKg:
              change.weightKg === undefined
                ? current.weightKg
                : change.weightKg,
            reps: change.reps ?? current.reps,
          }),
        'Could not change the target.'
      );
    const step = weightInUnit(sheet.stepKg, units);

    return (
      <>
        <Row spacing={8} alignment="center">
          <Column spacing={2}>
            <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
              Overload target
            </Text>
            <Text textStyle={{ fontSize: 15 }}>{sheet.exerciseName}</Text>
          </Column>
          <Spacer />
          <Text textStyle={{ fontSize: 14 }}>
            {`${repRange.min}–${repRange.max} reps`}
          </Text>
        </Row>
        <Column spacing={4}>
          {label('Last time')}
          <Text textStyle={{ fontSize: 17 }}>
            {lastTime
              ? lastTime.map((set) => setSummary(set, units)).join(' · ')
              : 'None yet'}
          </Text>
          {lastTime && targeted ? (
            <Text textStyle={{ fontSize: 13, color: colors.mutedForeground }}>
              {lastTime
                .map((set) =>
                  set.rpe === null
                    ? 'effort not checked'
                    : `${effortScale} ${formatEffort(effortInScale(set.rpe, effortScale))}`
                )
                .join(' · ')}
            </Text>
          ) : null}
        </Column>
        {!targeted ? (
          <Text textStyle={{ fontSize: 15 }}>{TIMED_TEXT}</Text>
        ) : !sheet.targetsOn ? (
          <Text textStyle={{ fontSize: 15 }}>
            Overload targets are off. Switch them on in Workout settings.
          </Text>
        ) : (
          <>
            <Column spacing={4}>
              {label('Suggested next')}
              <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                {!sheet.exerciseTargetsOn
                  ? 'Off for this Exercise'
                  : basis?.declined
                    ? 'Declined for this Workout'
                    : suggested.length === 0
                      ? 'No target'
                      : suggested
                          .map((target) => targetText(target, units))
                          .join(' · ')}
              </Text>
              {basis?.edited ? (
                <Text textStyle={{ fontSize: 13 }}>
                  Your own target for this Workout.
                </Text>
              ) : null}
            </Column>
            {sheet.exerciseTargetsOn && !basis?.declined ? (
              <Column spacing={8}>
                <Row spacing={8} alignment="center">
                  <Text textStyle={{ fontSize: 15 }}>
                    {current.weightKg === null
                      ? 'No weight'
                      : `${weightInUnit(current.weightKg, units)} ${units}`}
                  </Text>
                  <Spacer />
                  <Button
                    label={`−${step} ${units}`}
                    variant="outlined"
                    disabled={current.weightKg === null}
                    onPress={() =>
                      edit({
                        weightKg: steppedValue(
                          'weight',
                          current.weightKg,
                          -1,
                          sheet.stepKg
                        ),
                      })
                    }
                  />
                  <Button
                    label={`+${step} ${units}`}
                    variant="outlined"
                    onPress={() =>
                      edit({
                        weightKg: steppedValue(
                          'weight',
                          current.weightKg,
                          1,
                          sheet.stepKg
                        ),
                      })
                    }
                  />
                </Row>
                <Row spacing={8} alignment="center">
                  <Text textStyle={{ fontSize: 15 }}>
                    {`${current.reps} reps`}
                  </Text>
                  <Spacer />
                  <Button
                    label="−1 rep"
                    variant="outlined"
                    disabled={current.reps <= 1}
                    onPress={() => edit({ reps: current.reps - 1 })}
                  />
                  <Button
                    label="+1 rep"
                    variant="outlined"
                    onPress={() => edit({ reps: current.reps + 1 })}
                  />
                </Row>
              </Column>
            ) : null}
            {basis && sheet.exerciseTargetsOn ? (
              <Column spacing={4}>
                {label('Why')}
                <Text textStyle={{ fontSize: 15 }}>
                  {whyText(basis, repRange, effortScale)}
                </Text>
                {basis.effortNotChecked && lastTime ? (
                  <Text textStyle={{ fontSize: 15 }}>
                    {effortNotCheckedText(unrated, lastTime.length)}
                  </Text>
                ) : null}
              </Column>
            ) : null}
            {basis?.plateau ? (
              <Column
                spacing={8}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.muted,
                }}
              >
                <Text textStyle={{ fontSize: 15 }}>{PLATEAU_TEXT}</Text>
                <Button
                  label="Dismiss"
                  variant="text"
                  onPress={() =>
                    run(
                      () => dismissPlateau({ workoutExerciseId }),
                      'Could not dismiss the Plateau.'
                    )
                  }
                />
              </Column>
            ) : null}
            <Column spacing={8}>
              {basis?.edited || basis?.declined ? (
                <Button
                  label="Reset to suggestion"
                  variant="outlined"
                  onPress={() =>
                    run(
                      () => resetTargets({ workoutExerciseId }),
                      'Could not reset the target.'
                    )
                  }
                />
              ) : null}
              {sheet.exerciseTargetsOn &&
              !basis?.declined &&
              suggested.length > 0 ? (
                <Button
                  label="Decline for this Workout"
                  variant="outlined"
                  onPress={() =>
                    run(
                      () => declineTargets({ workoutExerciseId }),
                      'Could not decline the target.'
                    )
                  }
                />
              ) : null}
              <Switch
                label={`Targets for ${sheet.exerciseName}`}
                value={sheet.exerciseTargetsOn}
                onValueChange={(enabled) =>
                  run(
                    () =>
                      setTargetsEnabled({
                        exerciseId: sheet.exerciseId,
                        enabled,
                      }),
                    'Could not switch targets for this Exercise.'
                  )
                }
              />
            </Column>
          </>
        )}
        {errorMessage ? (
          <Text textStyle={{ fontSize: 15 }}>{errorMessage}</Text>
        ) : null}
      </>
    );
  };

  return (
    <BottomSheet
      isPresented={workoutExerciseId !== null}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half', 'full']}
    >
      <ScrollView>
        <Column spacing={16} style={{ padding: 16 }}>
          {body()}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
