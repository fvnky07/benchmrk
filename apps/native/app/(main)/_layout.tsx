import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { ActiveWorkoutMiniPlayer } from '@/components/workout/ActiveWorkoutMiniPlayer';

/**
 * Main app layout with native tabs navigation
 *
 * NOTE: This is only accessible when user is authenticated
 * Protected by Stack.Protected guard in app/_layout.tsx
 *
 * Uses platform-native tab bars:
 * - iOS: Native UITabBar with SF Symbols
 * - Android: Uses SF Symbols (cross-platform fallback in SDK 54)
 *
 * Note: SDK 54 doesn't support Material icons via 'md' prop yet.
 * Material Design icons support is available in SDK 55+.
 */
export default function MainLayout() {
  const colorScheme = useColorScheme();
  const iconColour = '#00ff90';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf="house.fill" selectedColor={iconColour} />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <Icon sf="magnifyingglass" selectedColor={iconColour} />
          <Label>Explore</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="workout">
          <Icon
            sf="figure.strengthtraining.traditional"
            selectedColor={iconColour}
          />
          <Label>Workout</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" selectedColor={iconColour} />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Icon sf="gearshape.fill" selectedColor={iconColour} />
          <Label>Settings</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <ActiveWorkoutMiniPlayer />
    </ThemeProvider>
  );
}
