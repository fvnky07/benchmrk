import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
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
      <NativeTabs tintColor={iconColour}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="workout">
          <NativeTabs.Trigger.Icon sf="figure.strengthtraining.traditional" />
          <NativeTabs.Trigger.Label>Workout</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.fill" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon sf="gearshape.fill" />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <ActiveWorkoutMiniPlayer />
    </ThemeProvider>
  );
}
