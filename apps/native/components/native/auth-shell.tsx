import { Column, Host, RNHostView, Row, ScrollView, Text } from '@expo/ui';
import { type ReactNode, useEffect } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';

import { BrandLogo } from '@/components/native/brand-logo';
import { textColor, useAppearance, useColors } from '@/lib/ui';

const CONTENT_MAX_WIDTH = 420;
const OUTER_INSET = 24;
const LOGO_SIZE = 56;

/** Width of the auth content column: the phone width minus insets, capped at 420pt. */
export function useAuthColumnWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width - OUTER_INSET * 2, CONTENT_MAX_WIDTH);
}

/**
 * The shared layout of every authentication route: one native Host, a
 * scrollable centered column, the benchmrk logo, route heading and supporting
 * copy, the route's content, then the factual legal footer.
 */
export function AuthShell({
  title,
  supportingText,
  children,
}: Readonly<{ title: string; supportingText: string; children: ReactNode }>) {
  const { resolvedAppearance } = useAppearance();
  const colors = useColors();
  const columnWidth = useAuthColumnWidth();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <ScrollView showsIndicators>
        <Column alignment="center" style={{ padding: OUTER_INSET }}>
          <Column spacing={16} style={{ width: columnWidth }}>
            <RNHostView matchContents>
              <BrandLogo size={LOGO_SIZE} />
            </RNHostView>
            <Column spacing={8}>
              <Text textStyle={{ fontSize: 30, fontWeight: '700' }}>
                {title}
              </Text>
              <Text textStyle={{ fontSize: 17 }}>{supportingText}</Text>
            </Column>
            {children}
            <Text
              textStyle={{
                fontSize: 14,
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
