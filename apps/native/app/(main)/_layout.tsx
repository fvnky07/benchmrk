import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ActiveWorkoutMiniPlayer } from '@/components/workout/ActiveWorkoutMiniPlayer';
import { useAppearance } from '@/lib/ui';
import { useNavigationChrome } from '@/lib/ui/navigation-chrome';

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
  const { resolvedAppearance } = useAppearance();
  const navigationChrome = useNavigationChrome(resolvedAppearance);

  return (
    <>
      <NativeTabs {...navigationChrome}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home_filled' }}
          />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="workout">
          <NativeTabs.Trigger.Icon
            sf="figure.strengthtraining.traditional"
            md="fitness_center"
          />
          <NativeTabs.Trigger.Label>Workout</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person', selected: 'person.fill' }}
            md={{ default: 'person', selected: 'person' }}
          />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
            md={{ default: 'settings', selected: 'settings' }}
          />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <ActiveWorkoutMiniPlayer />
    </>
  );
}
