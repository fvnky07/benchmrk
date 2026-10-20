import AddIcon from '@expo/material-symbols/add.xml';
import EditNoteIcon from '@expo/material-symbols/edit_note.xml';
import FitnessCenterIcon from '@expo/material-symbols/fitness_center.xml';
import InfoIcon from '@expo/material-symbols/info.xml';
import SwapIcon from '@expo/material-symbols/swap_horiz.xml';
import TuneIcon from '@expo/material-symbols/tune.xml';
import WandIcon from '@expo/material-symbols/wand_stars.xml';
import type { IconProps } from '@expo/ui';
import type { QuickActionId } from '@repo/backend/convex/memberSettings';

export type { QuickActionId };

/** A cross-platform universal `Icon` name: an SF Symbol and a Material Symbol. */
export type QuickActionIcon = Extract<
  IconProps['name'],
  { ios: unknown; android: unknown }
>;

/** Copy and icons for every configurable chip in the quick action row. */
export const QUICK_ACTIONS: Record<
  QuickActionId,
  { label: string; icon: QuickActionIcon; iconOnly?: true }
> = {
  wand: {
    label: 'Fill every empty Set from the Overload target',
    icon: { ios: 'wand.and.stars', android: WandIcon },
    iconOnly: true,
  },
  addSet: { label: 'Add Set', icon: { ios: 'plus', android: AddIcon } },
  info: { label: 'Info', icon: { ios: 'info.circle', android: InfoIcon } },
  swap: {
    label: 'Swap',
    icon: { ios: 'arrow.left.arrow.right', android: SwapIcon },
  },
  note: { label: 'Note', icon: { ios: 'note.text', android: EditNoteIcon } },
  setup: {
    label: 'Setup',
    icon: { ios: 'slider.horizontal.3', android: TuneIcon },
  },
  plates: {
    label: 'Plates',
    icon: { ios: 'circle.circle', android: FitnessCenterIcon },
  },
};

/** Chips whose features exist; later Workout features add theirs here. */
export const AVAILABLE_QUICK_ACTIONS: ReadonlySet<QuickActionId> = new Set([
  'wand',
  'addSet',
  'info',
  'swap',
  'note',
  'setup',
  'plates',
]);
