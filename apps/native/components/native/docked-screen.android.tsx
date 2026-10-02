import { Column, Host, ScrollView } from '@expo/ui';
import { fillMaxSize, weight } from '@expo/ui/jetpack-compose/modifiers';

import { useAppearance } from '@/lib/ui';
import type { DockedScreenProps } from './docked-screen';

/** A scrolling screen with a pinned bottom dock; the scroll area takes the remaining height. */
export function DockedScreen({ children, dock }: Readonly<DockedScreenProps>) {
  const { resolvedAppearance } = useAppearance();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <Column spacing={0} modifiers={[fillMaxSize()]}>
        <ScrollView showsIndicators modifiers={[weight(1)]}>
          <Column spacing={16} style={{ padding: 24 }}>
            {children}
          </Column>
        </ScrollView>
        {dock ? (
          <Column style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            {dock}
          </Column>
        ) : null}
      </Column>
    </Host>
  );
}
