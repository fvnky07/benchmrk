import { Column, Host } from '@expo/ui';
import { Group, List } from '@expo/ui/swift-ui';
import { listRowSeparator, listStyle } from '@expo/ui/swift-ui/modifiers';

import { useAppearance } from '@/lib/ui';
import type { DockedScreenProps } from './docked-screen';

/**
 * A plain SwiftUI List with a pinned bottom dock. Each child view is its own
 * row, which is what lets Set rows carry native swipe actions.
 */
export function DockedScreen({ children, dock }: Readonly<DockedScreenProps>) {
  const { resolvedAppearance } = useAppearance();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <Column spacing={0}>
        <List modifiers={[listStyle('plain')]}>
          <Group modifiers={[listRowSeparator('hidden')]}>{children}</Group>
        </List>
        {dock ? (
          <Column style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            {dock}
          </Column>
        ) : null}
      </Column>
    </Host>
  );
}
