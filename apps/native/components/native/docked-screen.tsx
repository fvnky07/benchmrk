import { Column, Host, ScrollView } from '@expo/ui';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useAppearance } from '@/lib/ui';
import { type ScreenShellProps, shellSafeAreaEdges } from './native-screen';

export type DockedScreenProps = ScreenShellProps &
  Readonly<{
    /** Pinned below the scrolling content, e.g. the Set keypad. */
    dock?: ReactNode;
  }>;

/** A scrolling screen with a pinned bottom dock (SwiftUI's ScrollView fills the stack). */
export function DockedScreen({ children, dock, edges }: DockedScreenProps) {
  const { resolvedAppearance } = useAppearance();

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <Column spacing={0}>
          <ScrollView showsIndicators>
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
