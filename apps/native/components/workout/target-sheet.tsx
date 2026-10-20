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

import { Card } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, tabularDigits, textColor, useColors } from '@/lib/ui';
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
  const colors = useColors();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const muted = { ...font.caption, color: textColor(colors.onSurfaceVariant) };
  const body = { ...font.body, color: textColor(colors.onSurface) };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    onActivity();
    try {
      setErrorMessage(null);
      await action();
    } catch {
      setErrorMessage(failure);
    }
  };

  const content = () => {
    if (!sheet || !workoutExerciseId) {
      return (
        <Card padding={space.lg}>
          <Text textStyle={muted}>Loading target…</Text>
        </Card>
      );
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
    const showsTargets = targeted && sheet.targetsOn;
    const editable = sheet.exerciseTargetsOn && !basis?.declined;

    return (
      <>
        <SectionHeader
          title="Overload target"
          supportingText={`${sheet.exerciseName} · ${repRange.min}–${repRange.max} reps`}
        />
        <Card divided>
          <Column spacing={space.xs} style={{ padding: space.lg }}>
            <Text textStyle={muted}>Last time</Text>
            <Text textStyle={body} modifiers={tabularDigits()}>
              {lastTime
                ? lastTime.map((set) => setSummary(set, units)).join(' · ')
                : 'None yet'}
            </Text>
            {lastTime && targeted ? (
              <Text textStyle={muted}>
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
            <Column style={{ padding: space.lg }}>
              <Text textStyle={body}>{TIMED_TEXT}</Text>
            </Column>
          ) : !sheet.targetsOn ? (
            <Column style={{ padding: space.lg }}>
              <Text textStyle={body}>
                Overload targets are off. Switch them on in Workout settings.
              </Text>
            </Column>
          ) : (
            <Column spacing={space.xs} style={{ padding: space.lg }}>
              <Text textStyle={muted}>Suggested next</Text>
              <Text
                textStyle={{
                  ...font.bodyStrong,
                  color: textColor(colors.onSurface),
                }}
                modifiers={tabularDigits()}
              >
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
                <Text textStyle={muted}>Your own target for this Workout.</Text>
              ) : null}
            </Column>
          )}
          {showsTargets && editable ? (
            <Column spacing={space.md} style={{ padding: space.lg }}>
              <Row spacing={space.sm} alignment="center">
                <Text textStyle={body} modifiers={tabularDigits()}>
                  {current.weightKg === null
                    ? 'No weight'
                    : `${weightInUnit(current.weightKg, units)} ${units}`}
                </Text>
                <Spacer flexible />
                <PillChip
                  label={`−${step} ${units}`}
                  disabled={current.weightKg === null}
                  onPress={() =>
                    void edit({
                      weightKg: steppedValue(
                        'weight',
                        current.weightKg,
                        -1,
                        sheet.stepKg
                      ),
                    })
                  }
                />
                <PillChip
                  label={`+${step} ${units}`}
                  onPress={() =>
                    void edit({
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
              <Row spacing={space.sm} alignment="center">
                <Text textStyle={body} modifiers={tabularDigits()}>
                  {`${current.reps} reps`}
                </Text>
                <Spacer flexible />
                <PillChip
                  label="−1 rep"
                  disabled={current.reps <= 1}
                  onPress={() => void edit({ reps: current.reps - 1 })}
                />
                <PillChip
                  label="+1 rep"
                  onPress={() => void edit({ reps: current.reps + 1 })}
                />
              </Row>
            </Column>
          ) : null}
          {showsTargets && basis && sheet.exerciseTargetsOn ? (
            <Column spacing={space.xs} style={{ padding: space.lg }}>
              <Text textStyle={muted}>Why</Text>
              <Text textStyle={body}>
                {whyText(basis, repRange, effortScale)}
              </Text>
              {basis.effortNotChecked && lastTime ? (
                <Text textStyle={body}>
                  {effortNotCheckedText(unrated, lastTime.length)}
                </Text>
              ) : null}
            </Column>
          ) : null}
        </Card>
        {showsTargets && basis?.plateau ? (
          <Card tone="high" padding={space.md} spacing={space.sm}>
            <Text textStyle={body}>{PLATEAU_TEXT}</Text>
            <Row>
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
            </Row>
          </Card>
        ) : null}
        {showsTargets ? (
          <Column spacing={space.sm}>
            {basis?.edited || basis?.declined ? (
              <PillChip
                label="Reset to suggestion"
                onPress={() =>
                  void run(
                    () => resetTargets({ workoutExerciseId }),
                    'Could not reset the target.'
                  )
                }
              />
            ) : null}
            {editable && suggested.length > 0 ? (
              <PillChip
                label="Decline for this Workout"
                onPress={() =>
                  void run(
                    () => declineTargets({ workoutExerciseId }),
                    'Could not decline the target.'
                  )
                }
              />
            ) : null}
          </Column>
        ) : null}
        {showsTargets ? (
          <Card padding={space.lg}>
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
          </Card>
        ) : null}
        {errorMessage ? (
          <Text textStyle={{ ...font.caption, color: textColor(colors.error) }}>
            {errorMessage}
          </Text>
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
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
        >
          {content()}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
