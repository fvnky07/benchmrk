import { Button } from '@expo/ui';

import type { QuickActionIcon } from '@/lib/workout/quick-actions';

export type QuickActionChipProps = {
  label: string;
  icon: QuickActionIcon;
  iconOnly?: boolean;
  onPress: () => void;
};

/** Fallback for platforms without a native chip (web, tests). */
export function QuickActionChip({
  label,
  onPress,
}: Readonly<QuickActionChipProps>) {
  return <Button label={label} variant="outlined" onPress={onPress} />;
}
