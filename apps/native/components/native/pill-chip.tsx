import { Icon, type IconProps, Row, Text } from '@expo/ui';
import type { ColorValue } from 'react-native';

import {
  type AppColors,
  accessibilityModifier,
  radius,
  size,
  textColor,
  useColors,
} from '@/lib/ui';

export type PillTone = 'neutral' | 'error';

/** Fill and content colours of a pill: selected → inverse surface, error → error container, else high surface. */
export function pillColors(
  colors: AppColors,
  {
    selected = false,
    tone = 'neutral',
  }: Readonly<{ selected?: boolean; tone?: PillTone }>
): { fill: ColorValue; on: ColorValue } {
  if (selected) {
    return { fill: colors.inverseSurface, on: colors.inverseOnSurface };
  }
  if (tone === 'error') {
    return { fill: colors.errorContainer, on: colors.onErrorContainer };
  }
  return { fill: colors.surfaceContainerHigh, on: colors.onSurface };
}

export type PillChipProps = Readonly<{
  label: string;
  icon?: IconProps['name'];
  /** Shows only the icon; `label` remains the accessibility label. */
  iconOnly?: boolean;
  selected?: boolean;
  tone?: PillTone;
  disabled?: boolean;
  onPress: () => void;
}>;

/** A 36pt pill action or filter chip. */
export function PillChip({
  label,
  icon,
  iconOnly = false,
  selected = false,
  tone = 'neutral',
  disabled = false,
  onPress,
}: PillChipProps) {
  const { fill, on } = pillColors(useColors(), { selected, tone });

  return (
    <Row
      alignment="center"
      spacing={6}
      onPress={onPress}
      disabled={disabled}
      style={{
        height: size.chip,
        paddingHorizontal: iconOnly ? 9 : icon ? 12 : 14,
        borderRadius: radius.pill,
        backgroundColor: fill,
        opacity: disabled ? 0.5 : 1,
      }}
      modifiers={[accessibilityModifier(label)]}
    >
      {icon ? <Icon name={icon} size={18} color={on} /> : null}
      {iconOnly ? null : (
        <Text
          textStyle={{ fontSize: 15, fontWeight: '600', color: textColor(on) }}
        >
          {label}
        </Text>
      )}
    </Row>
  );
}
