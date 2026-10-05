import type { ColorValue } from 'react-native';

/**
 * `@expo/ui` universal `Text` types `textStyle.color` as `string`, but it
 * forwards the value to SwiftUI/Compose colour props that accept any
 * `ColorValue` (including iOS `PlatformColor`).
 */
export function textColor(color: ColorValue): string {
  return color as string;
}
