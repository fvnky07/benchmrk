import { useMaterialColors } from '@expo/ui/jetpack-compose';

import { useAppearance } from './appearance';
import type { AppColors } from './colors.types';

/** Material You colours from the wallpaper, in the app's resolved appearance. */
export function useColors(): AppColors {
  const { resolvedAppearance } = useAppearance();
  return useMaterialColors({ colorScheme: resolvedAppearance });
}
