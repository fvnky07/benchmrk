import { Host, List, ListItem, Picker, Text } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useColorScheme } from 'react-native';

import { analytics } from '@/lib/analytics';
import { type AppearancePreference, useAppearance } from '@/lib/ui';

const THEME_OPTIONS: ReadonlyArray<{
  label: string;
  value: AppearancePreference;
}> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function AppearanceScreen() {
  const systemAppearance = useColorScheme();
  const {
    isLoadingPreference,
    isSavingPreference,
    preference,
    resolvedAppearance,
    setPreference,
  } = useAppearance();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('appearance');
    }, [])
  );

  const handlePreferenceChange = useCallback(
    async (next: AppearancePreference) => {
      if (next === preference || isSavingPreference) {
        return;
      }

      setErrorMessage(null);

      try {
        await setPreference(next);
        analytics.themeChanged(next);
      } catch {
        setErrorMessage(
          'Could not save your appearance preference. Try again.'
        );
      }
    },
    [isSavingPreference, preference, setPreference]
  );

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <List>
        <ListItem supportingText="Choose whether Benchmrk follows your device appearance or stays light or dark. On Android 12 and later, controls use colors from your wallpaper.">
          Appearance
        </ListItem>
        <Picker
          selectedValue={preference}
          onValueChange={handlePreferenceChange}
          enabled={!isSavingPreference && !isLoadingPreference}
        >
          {THEME_OPTIONS.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
        <ListItem
          supportingText={`Your device is currently using ${systemAppearance === 'dark' ? 'dark' : 'light'} appearance.`}
        >
          System appearance
        </ListItem>
        {isLoadingPreference ? (
          <ListItem supportingText="Loading your saved preference…">
            Appearance
          </ListItem>
        ) : null}
        {isSavingPreference ? (
          <ListItem supportingText="Saving your appearance preference…">
            Appearance
          </ListItem>
        ) : null}
        {errorMessage ? (
          <ListItem supportingText={errorMessage}>Could not save</ListItem>
        ) : null}
        <ListItem>
          <Text textStyle={{ fontSize: 14 }}>
            This setting affects this account only. Signed-out screens follow
            your device.
          </Text>
        </ListItem>
      </List>
    </Host>
  );
}
