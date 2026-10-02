import { Column, Host, ScrollView } from '@expo/ui';
import type { ReactNode } from 'react';

import { useAppearance } from '@/lib/ui';

export type DockedScreenProps = {
  children: ReactNode;
  /** Pinned below the scrolling content, e.g. the Set keypad. */
  dock?: ReactNode;
};

/** A scrolling screen with a pinned bottom dock (SwiftUI's ScrollView fills the stack). */
export function DockedScreen({ children, dock }: Readonly<DockedScreenProps>) {
  const { resolvedAppearance } = useAppearance();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <Column spacing={0}>
        <ScrollView showsIndicators>
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
