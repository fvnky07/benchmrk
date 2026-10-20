import AddIcon from '@expo/material-symbols/add.xml';
import {
  BottomSheet,
  Button,
  Column,
  Row,
  ScrollView,
  Spacer,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Card } from '@/components/native/card';
import { NativeTextField } from '@/components/native/native-text-field';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, tabularDigits, textColor, useColors } from '@/lib/ui';
import {
  type MachinePositions,
  type MachineSetup,
  POSITION_KEYS,
  POSITIONS,
} from '@/lib/workout/machine-setup';

const ADD = { ios: 'plus', android: AddIcon } as const;

type MachineSetupSheetProps = {
  /** The machine or cable Exercise being set up; null when closed. */
  exercise: {
    exerciseId: Id<'exercises'>;
    name: string;
    machineSetup: MachineSetup | null;
  } | null;
  /** Called on every edit, so the Workout counts as active. */
  onActivity: () => void;
  onDismiss: () => void;
};

/**
 * Edits the member's Machine setup: labelled steppers and custom fields.
 * Render it with a `key` per opening; the draft starts from the saved setup.
 */
export function MachineSetupSheet({
  exercise,
  onActivity,
  onDismiss,
}: Readonly<MachineSetupSheetProps>) {
  const saveSetup = useMutation(api.machineSetups.save);
  const removeSetup = useMutation(api.machineSetups.remove);
  const colors = useColors();
  const [positions, setPositions] = useState<MachinePositions>(
    exercise?.machineSetup?.positions ?? {}
  );
  const [custom, setCustom] = useState(exercise?.machineSetup?.custom ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editCustom: typeof setCustom = (update) => {
    onActivity();
    setCustom(update);
  };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    onActivity();
    try {
      setErrorMessage(null);
      await action();
      onDismiss();
    } catch {
      setErrorMessage(failure);
    }
  };

  const stepPosition = (key: keyof MachinePositions, direction: 1 | -1) => {
    onActivity();
    setPositions((current) => {
      const { step, min } = POSITIONS[key];
      const value = current[key];
      const next =
        value === undefined
          ? direction > 0
            ? min
            : undefined
          : value + direction * step;
      const { [key]: _removed, ...others } = current;
      return next === undefined || next < min
        ? others
        : { ...others, [key]: next };
    });
  };

  const hasValues =
    Object.keys(positions).length > 0 ||
    custom.some((field) => field.label.trim() && field.value.trim());

  return (
    <BottomSheet
      isPresented={exercise !== null}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half', 'full']}
    >
      <ScrollView>
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
        >
          <SectionHeader title={`Machine setup · ${exercise?.name ?? ''}`} />
          <Card divided>
            {POSITION_KEYS.map((key) => {
              const { label, step, suffix } = POSITIONS[key];
              const value = positions[key];
              return (
                <Row
                  key={key}
                  spacing={space.sm}
                  alignment="center"
                  style={{
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                  }}
                >
                  <Column spacing={2}>
                    <Text
                      textStyle={{
                        ...font.caption,
                        color: textColor(colors.onSurfaceVariant),
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      textStyle={{
                        ...font.bodyStrong,
                        color: textColor(colors.onSurface),
                      }}
                      modifiers={tabularDigits()}
                    >
                      {value === undefined ? 'Not set' : `${value}${suffix}`}
                    </Text>
                  </Column>
                  <Spacer flexible />
                  <PillChip
                    label={`−${step}${suffix}`}
                    disabled={value === undefined}
                    onPress={() => stepPosition(key, -1)}
                  />
                  <PillChip
                    label={`+${step}${suffix}`}
                    onPress={() => stepPosition(key, 1)}
                  />
                </Row>
              );
            })}
          </Card>
          <SectionHeader title="Custom fields" />
          {custom.map((field, index) => (
            <Card
              // biome-ignore lint/suspicious/noArrayIndexKey: fields are edited in place by position
              key={index}
              padding={space.lg}
              spacing={space.md}
            >
              <NativeTextField
                label="Field"
                placeholder="Handle"
                value={field.label}
                onChangeText={(text) =>
                  editCustom((current) =>
                    current.map((item, at) =>
                      at === index ? { ...item, label: text } : item
                    )
                  )
                }
              />
              <NativeTextField
                label="Value"
                placeholder="V-bar"
                value={field.value}
                onChangeText={(text) =>
                  editCustom((current) =>
                    current.map((item, at) =>
                      at === index ? { ...item, value: text } : item
                    )
                  )
                }
              />
              <Row>
                <PillChip
                  label="Remove field"
                  onPress={() =>
                    editCustom((current) =>
                      current.filter((_, at) => at !== index)
                    )
                  }
                />
              </Row>
            </Card>
          ))}
          <Row>
            <PillChip
              label="Add field"
              icon={ADD}
              onPress={() =>
                editCustom((current) => [...current, { label: '', value: '' }])
              }
            />
          </Row>
          {errorMessage ? (
            <Text
              textStyle={{ ...font.caption, color: textColor(colors.error) }}
            >
              {errorMessage}
            </Text>
          ) : null}
          <PrimaryButton
            label="Save setup"
            disabled={!hasValues || !exercise}
            onPress={() => {
              if (!exercise) return;
              void run(
                () =>
                  saveSetup({
                    exerciseId: exercise.exerciseId,
                    positions,
                    custom,
                  }),
                'Could not save this Machine setup.'
              );
            }}
          />
          {exercise?.machineSetup ? (
            <Button
              label="Remove setup"
              variant="text"
              onPress={() =>
                run(
                  () => removeSetup({ exerciseId: exercise.exerciseId }),
                  'Could not remove this Machine setup.'
                )
              }
            />
          ) : null}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
