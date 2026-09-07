import { useMaterialColors } from '@expo/ui/jetpack-compose';

import type { ResolvedAppearance } from './appearance-state';

export function useNavigationChrome(appearance: ResolvedAppearance) {
  const colors = useMaterialColors({ colorScheme: appearance });

  return {
    backgroundColor: colors.surface,
    iconColor: colors.onSurface,
    indicatorColor: colors.secondaryContainer,
    rippleColor: colors.secondaryContainer,
    tintColor: colors.primary,
  };
}
