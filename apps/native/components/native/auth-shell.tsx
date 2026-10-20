import { Column, Host, RNHostView, Row, ScrollView, Text } from '@expo/ui';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/native/brand-logo';
import {
  font,
  space,
  textColor,
  useAppearance,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import {
  type ScreenEdge,
  type ScreenShellProps,
  shellSafeAreaEdges,
} from './native-screen';

const CONTENT_MAX_WIDTH = 420;
const LOGO_SIZE = 56;
const DEFAULT_EDGES: readonly ScreenEdge[] = ['top', 'bottom'];

/** Width of the auth content column: the content width, capped at 420pt. */
export function useAuthColumnWidth(): number {
  return Math.min(useContentWidth(), CONTENT_MAX_WIDTH);
}

/**
 * The shared layout of every authentication route: one native Host, a
 * scrollable centered column, the benchmrk logo, route heading and supporting
 * copy, the route's content, then the factual legal footer. `edges` defaults
 * to top and bottom for header-less routes; routes under the auth Stack header
 * pass `['bottom']`, because Android reports the full status-bar inset even
 * below a native header and would pad the top twice.
 */
export function AuthShell({
  title,
  supportingText,
  children,
  edges = DEFAULT_EDGES,
}: ScreenShellProps & Readonly<{ title: string; supportingText: string }>) {
  const { resolvedAppearance } = useAppearance();
  const colors = useColors();
  const columnWidth = useAuthColumnWidth();

  return (
    <SafeAreaView edges={shellSafeAreaEdges(edges)} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <ScrollView showsIndicators>
          <Column alignment="center" style={{ padding: space.screen }}>
            <Column spacing={space.lg} style={{ width: columnWidth }}>
              <RNHostView matchContents>
                <BrandLogo size={LOGO_SIZE} />
              </RNHostView>
              <Column spacing={space.sm}>
                <Text
                  textStyle={{
                    ...font.title,
                    color: textColor(colors.onSurface),
                  }}
                >
                  {title}
                </Text>
                <Text
                  textStyle={{
                    ...font.body,
                    color: textColor(colors.onSurface),
                  }}
                >
                  {supportingText}
                </Text>
              </Column>
              {children}
              <Text
                textStyle={{
                  ...font.caption,
                  color: textColor(colors.onSurfaceVariant),
                  textAlign: 'center',
                }}
              >
                Terms of Service and Privacy Policy coming soon.
              </Text>
            </Column>
          </Column>
        </ScrollView>
      </Host>
    </SafeAreaView>
  );
}

/** A quiet hairline across the column with a centered `or`; not interactive. */
export function AuthDivider() {
  const colors = useColors();
  const hairlineWidth = (useAuthColumnWidth() - 40) / 2;

  return (
    <Row spacing={12} alignment="center" style={{ paddingVertical: 16 }}>
      <Column
        style={{
          height: 1,
          width: hairlineWidth,
          backgroundColor: colors.outlineVariant,
        }}
      />
      <Text
        textStyle={{ fontSize: 15, color: textColor(colors.onSurfaceVariant) }}
      >
        or
      </Text>
      <Column
        style={{
          height: 1,
          width: hairlineWidth,
          backgroundColor: colors.outlineVariant,
        }}
      />
    </Row>
  );
}

/**
 * A status line for loading, cancellation, failure, success or offline. It is
 * announced to VoiceOver and TalkBack whenever the message changes.
 */
export function AuthStatus({
  message,
  tone = 'neutral',
}: Readonly<{ message: string; tone?: 'neutral' | 'error' }>) {
  const colors = useColors();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Text
      textStyle={{
        fontSize: 15,
        color: textColor(
          tone === 'error' ? colors.error : colors.onSurfaceVariant
        ),
      }}
    >
      {message}
    </Text>
  );
}
