import { Column, Picker, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { toKg, type WeightUnit } from '@repo/backend/convex/domain/units';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import {
  accessibilityModifier,
  font,
  space,
  textColor,
  useColors,
} from '@/lib/ui';
import { weightInUnit } from '@/lib/workout/format';

const REST_CHOICES_SECONDS = [30, 60, 90, 120, 180, 240];

/** Smallest increments a gym usually has, in each unit. */
const INCREMENT_CHOICES: Record<WeightUnit, readonly number[]> = {
  kg: [0.5, 1, 1.25, 2.5],
  lb: [1, 2.5, 5],
};

/** A card row with its explanation, and the `Picker` that changes it underneath. */
function PickerRow({
  title,
  supportingText,
  children,
}: Readonly<{ title: string; supportingText: string; children: ReactNode }>) {
  return (
    <Column>
      <CardRow supportingText={supportingText}>{title}</CardRow>
      <Column style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        {children}
      </Column>
    </Column>
  );
}

/** A card row whose trailing `Switch` is labelled by the row's headline. */
function SwitchRow({
  label,
  supportingText,
  value,
  disabled,
  onValueChange,
}: Readonly<{
  label: string;
  supportingText?: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}>) {
  return (
    <CardRow
      supportingText={supportingText}
      trailing={
        <Switch
          disabled={disabled}
          modifiers={[accessibilityModifier(label)]}
          value={value}
          onValueChange={onValueChange}
        />
      }
    >
      {label}
    </CardRow>
  );
}

export default function WorkoutSettingsScreen() {
  const colors = useColors();
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const setTargetsEnabled = useMutation(api.overload.setTargetsEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('workout_settings');
    }, [])
  );

  const save = async (change: () => Promise<unknown>, track?: () => void) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await change();
      track?.();
    } catch {
      setErrorMessage('Could not save this setting. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const caption = { ...font.body, color: textColor(colors.onSurfaceVariant) };

  if (settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={caption}>Loading workout settings…</Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={caption}>
          Sign in to change your workout settings.
        </Text>
      </NativeScreen>
    );
  }

  const update = (
    changes: FunctionArgs<typeof api.memberSettings.update>,
    track?: () => void
  ) => save(() => updateSettings(changes), track);
  const increment = weightInUnit(settings.smallestIncrementKg, settings.units);
  const incrementChoices = [
    ...new Set([...INCREMENT_CHOICES[settings.units], increment]),
  ].sort((a, b) => a - b);

  return (
    <NativeScreen>
      <Card divided>
        <PickerRow
          title="Default rest"
          supportingText="Used when an Exercise has no planned rest of its own."
        >
          <Picker
            enabled={!isSaving}
            selectedValue={settings.defaultRestSeconds}
            onValueChange={(value) => {
              if (typeof value === 'number') {
                update({ defaultRestSeconds: value }, () =>
                  analytics.restTimerChanged(value)
                );
              }
            }}
          >
            {REST_CHOICES_SECONDS.map((seconds) => (
              <Picker.Item
                key={seconds}
                label={`${seconds} seconds`}
                value={seconds}
              />
            ))}
          </Picker>
        </PickerRow>
        <PickerRow
          title="Units"
          supportingText="Used for every weight you see and enter."
        >
          <Picker
            enabled={!isSaving}
            selectedValue={settings.units}
            onValueChange={(value) => {
              if (value === 'kg' || value === 'lb') {
                update({ units: value }, () =>
                  analytics.weightUnitChanged(value)
                );
              }
            }}
          >
            <Picker.Item label="Kilograms (kg)" value="kg" />
            <Picker.Item label="Pounds (lb)" value="lb" />
          </Picker>
        </PickerRow>
        <PickerRow
          title="Effort rating"
          supportingText="How you rate the effort of a Set. Past ratings keep their meaning when you switch."
        >
          <Picker
            enabled={!isSaving}
            selectedValue={settings.effortScale}
            onValueChange={(value) => {
              if (value === 'RPE' || value === 'RIR') {
                update({ effortScale: value });
              }
            }}
          >
            <Picker.Item label="RPE (rate of perceived exertion)" value="RPE" />
            <Picker.Item label="RIR (reps in reserve)" value="RIR" />
          </Picker>
        </PickerRow>
        <PickerRow
          title="Smallest increment"
          supportingText="The smallest weight change your gym can load, used when a target suggests a smaller jump."
        >
          <Picker
            enabled={!isSaving}
            selectedValue={increment}
            onValueChange={(value) => {
              if (typeof value === 'number') {
                update({ smallestIncrementKg: toKg(value, settings.units) });
              }
            }}
          >
            {incrementChoices.map((choice) => (
              <Picker.Item
                key={choice}
                label={`${choice} ${settings.units}`}
                value={choice}
              />
            ))}
          </Picker>
        </PickerRow>
      </Card>
      <Card divided>
        <SwitchRow
          disabled={isSaving}
          label="Haptics"
          value={settings.haptics}
          onValueChange={(haptics) => update({ haptics })}
        />
        <SwitchRow
          disabled={isSaving}
          label="Rest-end sound"
          value={settings.restEndSound}
          onValueChange={(restEndSound) => update({ restEndSound })}
        />
        <SwitchRow
          disabled={isSaving}
          label="Move to the next Exercise"
          supportingText="In Alternating sets, move to the next Exercise of the round after each Set. You can always stay with one tap."
          value={settings.autoAdvance}
          onValueChange={(autoAdvance) => update({ autoAdvance })}
        />
        <SwitchRow
          disabled={isSaving}
          label="Show ahead or behind"
          supportingText="Quiet text beside the progress row, against the Routine's target duration."
          value={settings.aheadBehind}
          onValueChange={(aheadBehind) => update({ aheadBehind })}
        />
        <SwitchRow
          disabled={isSaving}
          label="Show Overload targets"
          supportingText="A target for every Set, from your own last Workout. You can also switch them off for one Exercise from its target."
          value={settings.overloadTargets}
          onValueChange={(enabled) =>
            save(() => setTargetsEnabled({ enabled }))
          }
        />
      </Card>
      <Card>
        <CardRow
          chevron
          supportingText="Choose and reorder the chips under the Exercise title."
          onPress={() => router.push('/(main)/settings/quick-actions')}
        >
          Quick actions
        </CardRow>
      </Card>
      {isSaving || errorMessage ? (
        <Card divided>
          {isSaving ? (
            <CardRow supportingText="Saving your setting…">Saving</CardRow>
          ) : null}
          {errorMessage ? (
            <CardRow supportingText={errorMessage}>Could not save</CardRow>
          ) : null}
        </Card>
      ) : null}
    </NativeScreen>
  );
}
