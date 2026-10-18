import { Button, Text } from '@expo/ui';

import { size, useContentWidth } from '@/lib/ui';

export type PrimaryButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Defaults to the content column width. */
  width?: number;
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
}: PrimaryButtonProps) {
  const contentWidth = useContentWidth();

  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      style={{ width: width ?? contentWidth, height: size.button }}
    >
      <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>{label}</Text>
    </Button>
  );
}
