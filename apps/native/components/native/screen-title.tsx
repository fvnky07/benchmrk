import { Column, Row, Spacer, Text } from '@expo/ui';
import type { ReactNode } from 'react';

import { font, textColor, useColors } from '@/lib/ui';

export type ScreenTitleProps = Readonly<{
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}>;

/** The large title of a header-less root screen; never under a native header. */
export function ScreenTitle({ title, subtitle, trailing }: ScreenTitleProps) {
  const colors = useColors();

  return (
    <Row alignment="center">
      <Column spacing={2}>
        <Text textStyle={{ ...font.title, color: textColor(colors.onSurface) }}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Column>
      {trailing ? (
        <>
          <Spacer flexible />
          {trailing}
        </>
      ) : null}
    </Row>
  );
}
