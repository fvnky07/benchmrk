import type { ColorValue } from 'react-native';

/**
 * The app's only colour source: Material 3 roles. Android fills them from
 * Material You (the wallpaper); iOS maps them to system colours. Pair every
 * `on*` role with the surface it names, e.g. `onSurfaceVariant` text on
 * `surfaceContainer`.
 */
export type AppColors = Readonly<{
  background: ColorValue;
  onBackground: ColorValue;
  surface: ColorValue;
  onSurface: ColorValue;
  onSurfaceVariant: ColorValue;
  surfaceContainerLowest: ColorValue;
  surfaceContainerLow: ColorValue;
  surfaceContainer: ColorValue;
  surfaceContainerHigh: ColorValue;
  surfaceContainerHighest: ColorValue;
  outline: ColorValue;
  outlineVariant: ColorValue;
  primary: ColorValue;
  onPrimary: ColorValue;
  primaryContainer: ColorValue;
  onPrimaryContainer: ColorValue;
  secondary: ColorValue;
  onSecondary: ColorValue;
  secondaryContainer: ColorValue;
  onSecondaryContainer: ColorValue;
  tertiary: ColorValue;
  onTertiary: ColorValue;
  tertiaryContainer: ColorValue;
  onTertiaryContainer: ColorValue;
  error: ColorValue;
  onError: ColorValue;
  errorContainer: ColorValue;
  onErrorContainer: ColorValue;
  inverseSurface: ColorValue;
  inverseOnSurface: ColorValue;
  scrim: ColorValue;
}>;
