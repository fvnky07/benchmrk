import { getMaterialColors } from '@expo/ui/jetpack-compose';
import { DefaultTheme, type Theme } from '@react-navigation/native';

import type { ResolvedAppearance } from './appearance-state';

export function createNavigationTheme(appearance: ResolvedAppearance): Theme {
  const colors = getMaterialColors({ scheme: appearance });

  return {
    ...DefaultTheme,
    dark: appearance === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      border: colors.outlineVariant,
      card: colors.surface,
      notification: colors.error,
      primary: colors.primary,
      text: colors.onSurface,
    },
  };
}
