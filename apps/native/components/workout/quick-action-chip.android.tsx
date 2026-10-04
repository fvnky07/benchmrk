import { AssistChip, Icon, Text } from '@expo/ui/jetpack-compose';

import type { QuickActionChipProps } from './quick-action-chip';

/** Material 3 AssistChip, the Android quick action chip. */
export function QuickActionChip({
  label,
  icon,
  iconOnly,
  onPress,
}: Readonly<QuickActionChipProps>) {
  return (
    <AssistChip onClick={onPress}>
      <AssistChip.LeadingIcon>
        <Icon
          source={icon.android}
          size={18}
          contentDescription={iconOnly ? label : undefined}
        />
      </AssistChip.LeadingIcon>
      <AssistChip.Label>
        <Text>{iconOnly ? '' : label}</Text>
      </AssistChip.Label>
    </AssistChip>
  );
}
