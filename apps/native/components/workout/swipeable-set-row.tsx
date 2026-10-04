import type { ReactNode } from 'react';

export type SwipeableSetRowProps = {
  /** Swiping right completes; omitted for logged Sets. */
  onComplete?: () => void;
  onDuplicate: () => void;
  /** Delete is only offered for unlogged Sets. */
  onDelete?: () => void;
  children: ReactNode;
};

/** Without native swipe actions (web, tests) the row's check and menus remain. */
export function SwipeableSetRow({ children }: Readonly<SwipeableSetRowProps>) {
  return children;
}
