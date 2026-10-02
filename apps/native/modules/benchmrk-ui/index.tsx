import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ReactNode } from 'react';

/**
 * Narrow Expo UI extensions for gestures Expo UI doesn't expose. Render them
 * inside an Expo UI Host, like any Expo UI view.
 */

export type SwipeRowProps = {
  /** Offer swipe-right Complete; logged Sets are already complete. */
  canComplete: boolean;
  /** Offer Delete; logged Sets can't be deleted. */
  canDelete: boolean;
  onComplete: () => void;
  onDuplicate: () => void;
  onNote: () => void;
  onDelete: () => void;
  children: ReactNode;
};

/** Android-only Compose swipe row (iOS uses SwiftUI List swipe actions). */
export const SwipeRow: React.ComponentType<SwipeRowProps> = requireNativeView(
  'BenchmrkUI',
  'SwipeRowView'
);

export type GestureBoxAction = { id: string; label: string };

export type GestureBoxProps = {
  /** What screen readers announce for the whole box. */
  label: string;
  /** Named screen-reader actions, the accessible path to the gestures. */
  actions?: readonly GestureBoxAction[];
  onTap: () => void;
  /** Long-press is only recognized when handled. */
  onLongPress?: () => void;
  /**
   * 1 = swiped right, -1 = swiped left. Only handled boxes claim horizontal
   * drags, so an unhandled box leaves them to an enclosing swipe row.
   */
  onSwipe?: (direction: 1 | -1) => void;
  onAction?: (id: string) => void;
  children: ReactNode;
};

type NativeGestureBoxProps = {
  label: string;
  actions: readonly GestureBoxAction[];
  swipeable: boolean;
  longPressable: boolean;
  onTap: () => void;
  onLongPress?: () => void;
  onSwipe?: (event: { nativeEvent: { direction: 1 | -1 } }) => void;
  onAction?: (event: { nativeEvent: { id: string } }) => void;
  children: ReactNode;
};

const NativeGestureBox: React.ComponentType<NativeGestureBoxProps> =
  requireNativeView('BenchmrkUI', 'GestureBoxView');

/** Tap, and optionally long-press and horizontal swipe, around Expo UI children. */
export function GestureBox({
  actions = [],
  onLongPress,
  onSwipe,
  onAction,
  ...props
}: GestureBoxProps) {
  return (
    <NativeGestureBox
      {...props}
      actions={actions}
      swipeable={onSwipe !== undefined}
      longPressable={onLongPress !== undefined}
      onLongPress={onLongPress}
      onSwipe={onSwipe && ((event) => onSwipe(event.nativeEvent.direction))}
      onAction={onAction && ((event) => onAction(event.nativeEvent.id))}
    />
  );
}

/** Android only: the Workout's ongoing notification (see WorkoutLiveStatus.kt). */
export const LiveStatus = requireOptionalNativeModule<{
  show(status: {
    startedAt: number;
    setsDone: number;
    setsPlanned: number;
    restEndsAt: number | null;
    url: string;
  }): void;
  clear(): void;
}>('BenchmrkLiveStatus');
