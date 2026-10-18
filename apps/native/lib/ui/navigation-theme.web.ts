import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import type { ResolvedAppearance } from './appearance-state';

export function createNavigationTheme(appearance: ResolvedAppearance): Theme {
  return appearance === 'dark' ? DarkTheme : DefaultTheme;
}
