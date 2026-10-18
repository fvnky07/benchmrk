import { useWindowDimensions } from 'react-native';

import { space } from './tokens';

/**
 * Width of a screen's content column: window width minus the 24pt screen
 * insets. Use for widths that must be numeric (buttons, tiles, keypad keys).
 */
export function useContentWidth(): number {
  return useWindowDimensions().width - 2 * space.screen;
}

/**
 * Width inside a `Card` with `padding={space.lg}` on a screen column. React
 * Native views hosted with `RNHostView matchContents` get no width from their
 * parent, so they need this numeric width.
 */
export function useCardContentWidth(): number {
  return useContentWidth() - 2 * space.lg;
}
