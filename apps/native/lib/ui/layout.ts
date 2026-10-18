import { useWindowDimensions } from 'react-native';

import { space } from './tokens';

/**
 * Width of a screen's content column: window width minus the 24pt screen
 * insets. Use for widths that must be numeric (buttons, tiles, keypad keys).
 */
export function useContentWidth(): number {
  return useWindowDimensions().width - 2 * space.screen;
}
