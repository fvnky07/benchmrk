import { requireNativeView } from 'expo';
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
  actions: readonly GestureBoxAction[];
  onTap: () => void;
  onLongPress: () => void;
  /** 1 = swiped right, -1 = swiped left. */
  onSwipe: (direction: 1 | -1) => void;
  onAction: (id: string) => void;
  children: ReactNode;
};

type NativeGestureBoxProps = Omit<GestureBoxProps, 'onSwipe' | 'onAction'> & {
  onSwipe: (event: { nativeEvent: { direction: 1 | -1 } }) => void;
  onAction: (event: { nativeEvent: { id: string } }) => void;
};

const NativeGestureBox: React.ComponentType<NativeGestureBoxProps> =
  requireNativeView('BenchmrkUI', 'GestureBoxView');

/** Tap, long-press and horizontal swipe around Expo UI children. */
export function GestureBox({ onSwipe, onAction, ...props }: GestureBoxProps) {
  return (
    <NativeGestureBox
      {...props}
      onSwipe={(event) => onSwipe(event.nativeEvent.direction)}
      onAction={(event) => onAction(event.nativeEvent.id)}
    />
  );
}
