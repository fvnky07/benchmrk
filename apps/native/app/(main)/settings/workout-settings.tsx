import { ListItem, Picker, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

const REST_CHOICES_SECONDS = [30, 60, 90, 120, 180, 240];

export default function WorkoutSettingsScreen() {
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('workout_settings');
    }, [])
  );

  const save = async (
    changes: FunctionArgs<typeof api.memberSettings.update>,
    track?: () => void
  ) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateSettings(changes);
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
            save({ defaultRestSeconds: value }, () =>
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
            save({ units: value }, () => analytics.weightUnitChanged(value));
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
            save({ effortScale: value });
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
        onValueChange={(haptics) => save({ haptics })}
      />
      {isSaving ? (
        <ListItem supportingText="Saving your setting…">Saving</ListItem>
      ) : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
