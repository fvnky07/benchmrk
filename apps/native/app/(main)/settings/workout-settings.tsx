import { ListItem, Picker, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function WorkoutSettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('workout_settings');
    }, [])
  );

  const save = async (
    key: string,
    value: number | boolean | string,
    track: () => void
  ) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updatePreferences({ [key]: value });
      track();
    } catch {
      setErrorMessage('Could not save this workout preference. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading workout settings…</Text>
      </NativeScreen>
    );
  }

  if (preferences === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>
          Sign in to manage workout settings.
        </Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Workout settings
      </Text>
      <ListItem supportingText="Applied when starting a rest timer.">
        Default rest timer
      </ListItem>
      <Picker
        enabled={!isSaving}
        selectedValue={preferences.defaultRestTimer}
        onValueChange={(value) => {
          if (typeof value === 'number') {
            save('defaultRestTimer', value, () =>
              analytics.restTimerChanged(value)
            );
          }
        }}
      >
        {[30, 60, 90, 120].map((seconds) => (
          <Picker.Item
            key={seconds}
            label={`${seconds} seconds`}
            value={seconds}
          />
        ))}
      </Picker>
      <ListItem supportingText="Used for weights throughout the app.">
        Weight unit
      </ListItem>
      <Picker
        enabled={!isSaving}
        selectedValue={preferences.weightUnit}
        onValueChange={(value) => {
          if (value === 'kg' || value === 'lbs') {
            save('weightUnit', value, () => analytics.weightUnitChanged(value));
          }
        }}
      >
        <Picker.Item label="Kilograms (kg)" value="kg" />
        <Picker.Item label="Pounds (lbs)" value="lbs" />
      </Picker>
      <Switch
        disabled={isSaving}
        label="Auto-save workouts"
        value={preferences.autoSaveWorkouts}
        onValueChange={(value) =>
          save('autoSaveWorkouts', value, () =>
            analytics.autoSaveToggled(value)
          )
        }
      />
      <Switch
        disabled={isSaving}
        label="Sync to cloud"
        value={preferences.syncToCloud}
        onValueChange={(value) =>
          save('syncToCloud', value, () => analytics.syncToggled(value))
        }
      />
      {isSaving ? (
        <ListItem supportingText="Saving workout preference…">Saving</ListItem>
      ) : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
