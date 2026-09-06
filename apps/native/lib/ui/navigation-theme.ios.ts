import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { ResolvedAppearance } from './appearance-state';

export function createNavigationTheme(appearance: ResolvedAppearance): Theme {
  return appearance === 'dark' ? DarkTheme : DefaultTheme;
}
