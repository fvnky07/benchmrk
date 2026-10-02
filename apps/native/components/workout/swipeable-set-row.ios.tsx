import { Button, SwipeActions } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';

import type { SwipeableSetRowProps } from './swipeable-set-row';

/**
 * SwiftUI List swipe actions: a full leading swipe completes, the trailing edge
 * offers Duplicate (full swipe) and Delete. VoiceOver lists them as actions.
 */
export function SwipeableSetRow({
  onComplete,
  onDuplicate,
  onDelete,
  children,
}: Readonly<SwipeableSetRowProps>) {
  return (
    <SwipeActions>
      {children}
      {onComplete ? (
        <SwipeActions.Actions edge="leading" allowsFullSwipe>
          <Button
            label="Complete"
            systemImage="checkmark"
            onPress={onComplete}
            modifiers={[tint('#2e9e4f')]}
          />
        </SwipeActions.Actions>
      ) : null}
      <SwipeActions.Actions edge="trailing" allowsFullSwipe>
        <Button
          label="Duplicate"
          systemImage="plus.square.on.square"
          onPress={onDuplicate}
          modifiers={[tint('#2a6fd6')]}
        />
        {onDelete ? (
          // biome-ignore lint/a11y/useValidAriaRole: SwiftUI ButtonRole, not an ARIA role
          <Button
            label="Delete"
            role="destructive"
            systemImage="trash"
            onPress={onDelete}
          />
        ) : null}
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
