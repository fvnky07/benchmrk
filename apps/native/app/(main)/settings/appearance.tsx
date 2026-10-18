import { Column, Picker, Text } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import {
  type AppearancePreference,
  font,
  space,
  textColor,
  useAppearance,
  useColors,
} from '@/lib/ui';

const THEME_OPTIONS: ReadonlyArray<{
  label: string;
  value: AppearancePreference;
}> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function AppearanceScreen() {
  const colors = useColors();
  const systemAppearance = useColorScheme();
  const { isLoadingPreference, isSavingPreference, preference, setPreference } =
    useAppearance();
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

  const hasStatus = isLoadingPreference || isSavingPreference || errorMessage;

  return (
    <NativeScreen>
      <Card divided>
        <Column>
          <CardRow supportingText="Choose whether Benchmrk follows your device appearance or stays light or dark. On Android 12 and later, controls use colors from your wallpaper.">
            Appearance
          </CardRow>
          <Column
            style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}
          >
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
          </Column>
        </Column>
        <CardRow
          supportingText={`Your device is currently using ${systemAppearance === 'dark' ? 'dark' : 'light'} appearance.`}
        >
          System appearance
        </CardRow>
      </Card>
      {hasStatus ? (
        <Card divided>
          {isLoadingPreference ? (
            <CardRow supportingText="Loading your saved preference…">
              Appearance
            </CardRow>
          ) : null}
          {isSavingPreference ? (
            <CardRow supportingText="Saving your appearance preference…">
              Appearance
            </CardRow>
          ) : null}
          {errorMessage ? (
            <CardRow supportingText={errorMessage}>Could not save</CardRow>
          ) : null}
        </Card>
      ) : null}
      <Text
        textStyle={{
          ...font.caption,
          color: textColor(colors.onSurfaceVariant),
        }}
      >
        This setting affects this account only. Signed-out screens follow your
        device.
      </Text>
    </NativeScreen>
  );
}
