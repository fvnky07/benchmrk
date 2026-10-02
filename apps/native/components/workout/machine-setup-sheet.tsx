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

import { NativeTextField } from '@/components/native/native-text-field';
import {
  type MachinePositions,
  type MachineSetup,
  POSITION_KEYS,
  POSITIONS,
} from '@/lib/workout/machine-setup';

type MachineSetupSheetProps = {
  /** The machine or cable Exercise being set up; null when closed. */
  exercise: {
    exerciseId: Id<'exercises'>;
    name: string;
    machineSetup: MachineSetup | null;
  } | null;
  onDismiss: () => void;
};

/**
 * Edits the member's Machine setup: labelled steppers and custom fields.
 * Render it with a `key` per opening; the draft starts from the saved setup.
 */
export function MachineSetupSheet({
  exercise,
  onDismiss,
}: Readonly<MachineSetupSheetProps>) {
  const saveSetup = useMutation(api.machineSetups.save);
  const removeSetup = useMutation(api.machineSetups.remove);
  const [positions, setPositions] = useState<MachinePositions>(
    exercise?.machineSetup?.positions ?? {}
  );
  const [custom, setCustom] = useState(exercise?.machineSetup?.custom ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    try {
      setErrorMessage(null);
      await action();
      onDismiss();
    } catch {
      setErrorMessage(failure);
    }
  };

  const stepPosition = (key: keyof MachinePositions, direction: 1 | -1) =>
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
        <Column spacing={12} style={{ padding: 16 }}>
          <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
            {`Machine setup · ${exercise?.name ?? ''}`}
          </Text>
          {POSITION_KEYS.map((key) => {
            const { label, step, suffix } = POSITIONS[key];
            const value = positions[key];
            return (
              <Row key={key} spacing={8} alignment="center">
                <Column spacing={2}>
                  <Text textStyle={{ fontSize: 15 }}>{label}</Text>
                  <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                    {value === undefined ? 'Not set' : `${value}${suffix}`}
                  </Text>
                </Column>
                <Spacer />
                <Button
                  label={`−${step}${suffix}`}
                  variant="outlined"
                  disabled={value === undefined}
                  onPress={() => stepPosition(key, -1)}
                />
                <Button
                  label={`+${step}${suffix}`}
                  variant="outlined"
                  onPress={() => stepPosition(key, 1)}
                />
              </Row>
            );
          })}
          <Text textStyle={{ fontSize: 15, fontWeight: '700' }}>
            Custom fields
          </Text>
          {custom.map((field, index) => (
            <Column
              // biome-ignore lint/suspicious/noArrayIndexKey: fields are edited in place by position
              key={index}
              spacing={8}
            >
              <NativeTextField
                label="Field"
                placeholder="Handle"
                value={field.label}
                onChangeText={(text) =>
                  setCustom((current) =>
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
                  setCustom((current) =>
                    current.map((item, at) =>
                      at === index ? { ...item, value: text } : item
                    )
                  )
                }
              />
              <Button
                label="Remove field"
                variant="text"
                onPress={() =>
                  setCustom((current) =>
                    current.filter((_, at) => at !== index)
                  )
                }
              />
            </Column>
          ))}
          <Button
            label="Add field"
            variant="outlined"
            onPress={() =>
              setCustom((current) => [...current, { label: '', value: '' }])
            }
          />
          {errorMessage ? (
            <Text textStyle={{ fontSize: 15 }}>{errorMessage}</Text>
          ) : null}
          <Button
            label="Save setup"
            disabled={!hasValues || !exercise}
            onPress={() =>
              exercise &&
              run(
                () =>
                  saveSetup({
                    exerciseId: exercise.exerciseId,
                    positions,
                    custom,
                  }),
                'Could not save this Machine setup.'
              )
            }
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
