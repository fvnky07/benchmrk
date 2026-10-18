import { Column, Host } from '@expo/ui';
import { Group, List } from '@expo/ui/swift-ui';
import { listRowSeparator, listStyle } from '@expo/ui/swift-ui/modifiers';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useAppearance } from '@/lib/ui';
import type { DockedScreenProps } from './docked-screen';
import { shellSafeAreaEdges } from './native-screen';

/**
 * A plain SwiftUI List with a pinned bottom dock. Each child view is its own
 * row, which is what lets Set rows carry native swipe actions.
 */
export function DockedScreen({ children, dock, edges }: DockedScreenProps) {
  const { resolvedAppearance } = useAppearance();

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <Column spacing={0}>
          <List modifiers={[listStyle('plain')]}>
            <Group modifiers={[listRowSeparator('hidden')]}>{children}</Group>
          </List>
          {dock ? (
            <Column
              style={{ paddingHorizontal: space.md, paddingBottom: space.md }}
            >
              {dock}
            </Column>
          ) : null}
        </Column>
      </Host>
    </SafeAreaView>
  );
}
