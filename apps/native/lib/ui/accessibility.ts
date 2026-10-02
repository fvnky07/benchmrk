import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';

/** The platform-native label modifier for a universal Expo UI control. */
export function accessibilityModifier(label: string) {
  return Platform.OS === 'ios'
    ? accessibilityLabel(label)
    : semantics({ contentDescription: label });
}
