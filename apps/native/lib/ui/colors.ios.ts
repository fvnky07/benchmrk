import { PlatformColor } from 'react-native';

import type { AppColors } from './colors.types';

// iOS system colours resolve against the window's interface style, which
// AppearanceProvider keeps in sync with the app's appearance preference.
const SYSTEM_COLORS: AppColors = {
  background: PlatformColor('systemGroupedBackground'),
  onBackground: PlatformColor('label'),
  surface: PlatformColor('systemGroupedBackground'),
  onSurface: PlatformColor('label'),
  onSurfaceVariant: PlatformColor('secondaryLabel'),
  surfaceContainerLowest: PlatformColor('systemGroupedBackground'),
  surfaceContainerLow: PlatformColor('secondarySystemGroupedBackground'),
  surfaceContainer: PlatformColor('secondarySystemGroupedBackground'),
  surfaceContainerHigh: PlatformColor('tertiarySystemGroupedBackground'),
  surfaceContainerHighest: PlatformColor('tertiarySystemFill'),
  outline: PlatformColor('opaqueSeparator'),
  outlineVariant: PlatformColor('separator'),
  primary: PlatformColor('systemBlue'),
  onPrimary: PlatformColor('white'),
  primaryContainer: PlatformColor('tertiarySystemFill'),
  onPrimaryContainer: PlatformColor('systemBlue'),
  secondary: PlatformColor('systemIndigo'),
  onSecondary: PlatformColor('white'),
  secondaryContainer: PlatformColor('secondarySystemFill'),
  onSecondaryContainer: PlatformColor('label'),
  tertiary: PlatformColor('systemOrange'),
  onTertiary: PlatformColor('white'),
  tertiaryContainer: PlatformColor('quaternarySystemFill'),
  onTertiaryContainer: PlatformColor('systemOrange'),
  error: PlatformColor('systemRed'),
  onError: PlatformColor('white'),
  errorContainer: PlatformColor('quaternarySystemFill'),
  onErrorContainer: PlatformColor('systemRed'),
  inverseSurface: PlatformColor('label'),
  inverseOnSurface: PlatformColor('systemBackground'),
  scrim: PlatformColor('black'),
};

export function useColors(): AppColors {
  return SYSTEM_COLORS;
}
