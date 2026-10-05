import type { ColorValue } from 'react-native';

/**
 * @expo/ui types the universal `Text` `textStyle.color` and Compose `Text`
 * `color` as `string`, but forwards them untouched to SwiftUI
 * `foregroundStyle` and Compose, which accept any `ColorValue` (including
 * `PlatformColor`; Android's Material colours are already hex strings). Use
 * this for `useColors()` roles on those two props; every other colour prop
 * takes them directly.
 */
export function textColor(color: ColorValue): string {
  return color as string;
}
