import { Button, Text } from '@expo/ui';

import { font, size, useContentWidth } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';

export type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Defaults to the content column width. */
  width?: number;
  /** What screen readers announce when `label` alone is ambiguous. */
  accessibilityLabel?: string;
}>;

/**
 * The screen's one full-width filled action. The native shape (Material pill,
 * iOS rounded rectangle) and content colour come from the platform button.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  width,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const contentWidth = useContentWidth();

  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      modifiers={
        accessibilityLabel
          ? [accessibilityModifier(accessibilityLabel)]
          : undefined
      }
      style={{ width: width ?? contentWidth, height: size.button }}
    >
      <Text textStyle={font.button}>{label}</Text>
    </Button>
  );
}
