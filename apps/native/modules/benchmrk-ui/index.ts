import { requireNativeView } from 'expo';
import type { ReactNode } from 'react';

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

/** Android-only Compose swipe row; render inside an Expo UI Host. */
export const SwipeRow: React.ComponentType<SwipeRowProps> = requireNativeView(
  'BenchmrkUI',
  'SwipeRowView'
);
