import { Column, Host, ScrollView } from '@expo/ui';
import { fillMaxSize, weight } from '@expo/ui/jetpack-compose/modifiers';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useAppearance } from '@/lib/ui';
import type { DockedScreenProps } from './docked-screen';
import { shellSafeAreaEdges } from './native-screen';

/** A scrolling screen with a pinned bottom dock; the scroll area takes the remaining height. */
export function DockedScreen({ children, dock, edges }: DockedScreenProps) {
  const { resolvedAppearance } = useAppearance();

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <Column spacing={0} modifiers={[fillMaxSize()]}>
          <ScrollView showsIndicators modifiers={[weight(1)]}>
            <Column spacing={space.lg} style={{ padding: space.screen }}>
              {children}
            </Column>
          </ScrollView>
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
