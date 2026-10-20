import type { UniversalBaseProps, UniversalStyle } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import {
  background,
  clipShape,
  frame,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { type ColorValue, Platform } from 'react-native';

type ModifierConfig = NonNullable<UniversalBaseProps['modifiers']>[number];

/**
 * Tabular (monospaced) digits for numbers that line up in columns. Roboto's
 * digits are already tabular on Android; iOS needs SwiftUI's `monospacedDigit`.
 */
export function tabularDigits(): ModifierConfig[] {
  return Platform.OS === 'ios' ? [monospacedDigit()] : [];
}

type Surface = Readonly<{
  backgroundColor: ColorValue;
  borderRadius?: number;
  padding?: number;
  height?: number;
}>;

/**
 * `style` and `modifiers` for a filled surface that spans its parent's width
 * (cards, hairlines); universal `Column`s otherwise hug their content. Compose
 * sizes the whole chain, so `fillMaxWidth()` after the style works. SwiftUI
 * applies the escape hatch after the background, so there the frame and the
 * fill are both built here, in padding → frame → background → clip order.
 */
export function fullWidthSurface(surface: Surface): {
  style?: UniversalStyle;
  modifiers: ModifierConfig[];
} {
  if (Platform.OS !== 'ios') {
    return { style: surface, modifiers: [fillMaxWidth()] };
  }

  return {
    modifiers: [
      ...(surface.padding ? [padding({ all: surface.padding })] : []),
      frame({
        maxWidth: Number.POSITIVE_INFINITY,
        minHeight: surface.height,
        maxHeight: surface.height,
        alignment: 'leading',
      }),
      background(surface.backgroundColor),
      ...(surface.borderRadius != null
        ? [clipShape('roundedRectangle', surface.borderRadius)]
        : []),
    ],
  };
}
