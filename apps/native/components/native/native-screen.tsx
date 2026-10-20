import { Column, Host, ScrollView } from '@expo/ui';
import type { ReactNode } from 'react';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { space, useAppearance } from '@/lib/ui';

export type ScreenEdge = 'top' | 'bottom';

export type ScreenShellProps = Readonly<{
  children: ReactNode;
  /** Window insets this screen pads itself for. Omit `top` under a native header and `bottom` inside the tab bar (expo-router pads it). */
  edges?: readonly ScreenEdge[];
}>;

/**
 * The insets a shell's `SafeAreaView` pads: the declared vertical edges plus
 * both sides. Android has no position-aware inset primitive (the provider
 * reports full window insets), so each route declares its edges statically.
 */
export function shellSafeAreaEdges(edges?: readonly ScreenEdge[]): Edge[] {
  return [...(edges ?? []), 'left', 'right'];
}

/** A scrolling native screen with the 24pt screen inset and 16pt rhythm. */
export function NativeScreen({ children, edges }: ScreenShellProps) {
  const { resolvedAppearance } = useAppearance();

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <ScrollView showsIndicators>
          <Column spacing={space.lg} style={{ padding: space.screen }}>
            {children}
          </Column>
        </ScrollView>
      </Host>
    </SafeAreaView>
  );
}
