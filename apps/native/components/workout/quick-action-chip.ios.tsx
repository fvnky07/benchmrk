import { Button } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';

import type { QuickActionChipProps } from './quick-action-chip';

/** A bordered capsule button, the iOS quick action chip. */
export function QuickActionChip({
  label,
  icon,
  iconOnly,
  onPress,
}: Readonly<QuickActionChipProps>) {
  return (
    <Button
      label={label}
      systemImage={icon.ios}
      onPress={onPress}
      modifiers={[
        buttonStyle('bordered'),
        buttonBorderShape('capsule'),
        ...(iconOnly
          ? [labelStyle('iconOnly'), accessibilityLabel(label)]
          : []),
      ]}
    />
  );
}
