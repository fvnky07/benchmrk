import { ListItem, Picker, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { toKg, type WeightUnit } from '@repo/backend/convex/domain/units';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import { weightInUnit } from '@/lib/workout/format';

const REST_CHOICES_SECONDS = [30, 60, 90, 120, 180, 240];

/** Smallest increments a gym usually has, in each unit. */
const INCREMENT_CHOICES: Record<WeightUnit, readonly number[]> = {
  kg: [0.5, 1, 1.25, 2.5],
  lb: [1, 2.5, 5],
};

export default function WorkoutSettingsScreen() {
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

  if (settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading workout settings…</Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>
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
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Workout settings
      </Text>
      <ListItem supportingText="Used when an Exercise has no planned rest of its own.">
        Default rest
      </ListItem>
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
      <ListItem supportingText="Used for every weight you see and enter.">
        Units
      </ListItem>
      <Picker
        enabled={!isSaving}
        selectedValue={settings.units}
        onValueChange={(value) => {
          if (value === 'kg' || value === 'lb') {
            update({ units: value }, () => analytics.weightUnitChanged(value));
          }
        }}
      >
        <Picker.Item label="Kilograms (kg)" value="kg" />
        <Picker.Item label="Pounds (lb)" value="lb" />
      </Picker>
      <ListItem supportingText="How you rate the effort of a Set. Past ratings keep their meaning when you switch.">
        Effort rating
      </ListItem>
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
      <Switch
        disabled={isSaving}
        label="Haptics"
        value={settings.haptics}
        onValueChange={(haptics) => update({ haptics })}
      />
      <Switch
        disabled={isSaving}
        label="Rest-end sound"
        value={settings.restEndSound}
        onValueChange={(restEndSound) => update({ restEndSound })}
      />
      <ListItem supportingText="A target for every Set, from your own last Workout. You can also switch them off for one Exercise from its target.">
        Overload targets
      </ListItem>
      <Switch
        disabled={isSaving}
        label="Show Overload targets"
        value={settings.overloadTargets}
        onValueChange={(enabled) => save(() => setTargetsEnabled({ enabled }))}
      />
      <ListItem supportingText="The smallest weight change your gym can load, used when a target suggests a smaller jump.">
        Smallest increment
      </ListItem>
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
      <ListItem
        supportingText="Choose and reorder the chips under the Exercise title."
        onPress={() => router.push('/(main)/settings/quick-actions')}
      >
        Quick actions
      </ListItem>
      {isSaving ? (
        <ListItem supportingText="Saving your setting…">Saving</ListItem>
      ) : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
