import { Column, Host, ScrollView } from '@expo/ui';
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactNode } from 'react';
import { type ColorValue, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fullWidthSurface, radius, space, useAppearance } from '@/lib/ui';
import { type ScreenShellProps, shellSafeAreaEdges } from './native-screen';

export type DockedScreenProps = ScreenShellProps &
  Readonly<{
    /** Fixed above the scrolling content, e.g. the Workout top bar. */
    header?: ReactNode;
    /** Pinned below the scrolling content, e.g. the Set keypad. */
    dock?: ReactNode;
    /** Draws the dock as a full-width surface of this colour, rounded on top. */
    dockFill?: ColorValue;
  }>;

/**
 * A scrolling screen with an optional fixed `header` above it and a pinned
 * bottom `dock`; the scroll area takes the remaining height (Compose needs the
 * weight, SwiftUI's ScrollView fills the stack). Dock content spans the window
 * less 12 on each side.
 */
export function DockedScreen({
  children,
  header,
  dock,
  dockFill,
  edges,
}: DockedScreenProps) {
  const { resolvedAppearance } = useAppearance();
  const isAndroid = Platform.OS === 'android';
  // A filled dock spans the window, rounded on top; SwiftUI has no per-corner
  // clip modifier here, so iOS rounds every corner. Either way its content
  // keeps the 12pt inset.
  const dockSurface =
    dockFill === undefined
      ? { style: { paddingHorizontal: space.md, paddingBottom: space.md } }
      : isAndroid
        ? {
            modifiers: [
              fillMaxWidth(),
              clip(
                Shapes.RoundedCorner({
                  topStart: radius.dock,
                  topEnd: radius.dock,
                })
              ),
              background(dockFill),
              paddingAll(space.md),
            ],
          }
        : fullWidthSurface({
            backgroundColor: dockFill,
            borderRadius: radius.dock,
            padding: space.md,
          });

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <Column spacing={0} modifiers={isAndroid ? [fillMaxSize()] : undefined}>
          {header ? (
            <Column
              style={{
                paddingHorizontal: space.screen,
                paddingTop: space.sm,
                paddingBottom: space.xs,
              }}
            >
              {header}
            </Column>
          ) : null}
          <ScrollView
            showsIndicators
            modifiers={isAndroid ? [weight(1)] : undefined}
          >
            <Column
              spacing={space.lg}
              style={{
                paddingHorizontal: space.screen,
                // The header above already spaces the content from the top.
                paddingTop: header ? space.sm : space.screen,
                paddingBottom: space.screen,
              }}
            >
              {children}
            </Column>
          </ScrollView>
          {dock ? (
            <Column spacing={space.sm} {...dockSurface}>
              {dock}
            </Column>
          ) : null}
        </Column>
      </Host>
    </SafeAreaView>
  );
}
