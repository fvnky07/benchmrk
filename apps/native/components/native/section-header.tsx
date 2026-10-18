import { Button, Column, Row, Spacer, Text } from '@expo/ui';

import { font, textColor, useColors } from '@/lib/ui';

export type SectionHeaderProps = Readonly<{
  title: string;
  supportingText?: string;
  action?: Readonly<{ label: string; onPress: () => void }>;
}>;

/** The heading above a group of cards, with an optional text action. */
export function SectionHeader({
  title,
  supportingText,
  action,
}: SectionHeaderProps) {
  const colors = useColors();

  return (
    <Row alignment="center">
      <Column spacing={2}>
        <Text
          textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
        >
          {title}
        </Text>
        {supportingText ? (
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            {supportingText}
          </Text>
        ) : null}
      </Column>
      {action ? (
        <>
          <Spacer flexible />
          <Button
            variant="text"
            label={action.label}
            onPress={action.onPress}
          />
        </>
      ) : null}
    </Row>
  );
}
