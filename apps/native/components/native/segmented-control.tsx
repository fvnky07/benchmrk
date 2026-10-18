import { Column, Row, Text } from '@expo/ui';

import {
  accessibilityModifier,
  font,
  radius,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';

const TRACK_PADDING = 4;

export type SegmentedControlProps<T extends string> = Readonly<{
  options: readonly Readonly<{ label: string; value: T }>[];
  value: T;
  onChange: (value: T) => void;
  /** Defaults to the content column width. */
  width?: number;
}>;

/** A pill track of equal segments; the selected one is an inverse-surface pill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  width,
}: SegmentedControlProps<T>) {
  const colors = useColors();
  const contentWidth = useContentWidth();
  const trackWidth = width ?? contentWidth;
  const cellWidth = (trackWidth - TRACK_PADDING * 2) / options.length;

  return (
    <Row
      style={{
        padding: TRACK_PADDING,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceContainer,
        width: trackWidth,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Column
            key={option.value}
            alignment="center"
            onPress={() => onChange(option.value)}
            style={{
              width: cellWidth,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.inverseSurface : undefined,
            }}
            modifiers={[accessibilityModifier(option.label)]}
          >
            <Text
              textStyle={{
                ...font.label,
                color: textColor(
                  selected ? colors.inverseOnSurface : colors.onSurface
                ),
              }}
            >
              {option.label}
            </Text>
          </Column>
        );
      })}
    </Row>
  );
}
