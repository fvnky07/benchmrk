import { SwipeRow } from '@/modules/benchmrk-ui';
import type { SwipeableSetRowProps } from './swipeable-set-row';

/** The Compose swipe row from the local benchmrk-ui module (see its Kotlin source). */
export function SwipeableSetRow({
  onComplete,
  onDuplicate,
  onNote,
  onDelete,
  children,
}: Readonly<SwipeableSetRowProps>) {
  return (
    <SwipeRow
      canComplete={onComplete !== undefined}
      canDelete={onDelete !== undefined}
      onComplete={() => onComplete?.()}
      onDuplicate={onDuplicate}
      onNote={onNote}
      onDelete={() => onDelete?.()}
    >
      {children}
    </SwipeRow>
  );
}
