import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  hasBorder?: boolean;
  disabled?: boolean;
  rightLabel?: string;
  rightLabelColor?: string;
};

export function SettingsRow({
  icon,
  iconColor = '#00ff90',
  label,
  onPress,
  showChevron = true,
  hasBorder = true,
  disabled = false,
  rightLabel,
  rightLabelColor = '#6b7280',
}: SettingsRowProps) {
  return (
    <Pressable
      className={`h-12 flex-row items-center px-4 ${hasBorder ? 'border-gray-800 border-b' : ''}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name={icon} size={28} color={iconColor} />
      <Text className="ml-3 flex-1 text-base text-white">{label}</Text>
      {rightLabel && (
        <Text className="mr-2 text-base" style={{ color: rightLabelColor }}>
          {rightLabel}
        </Text>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={iconColor} />
      )}
    </Pressable>
  );
}
