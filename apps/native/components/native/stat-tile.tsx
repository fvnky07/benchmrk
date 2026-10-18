import { Column, Row, Text } from '@expo/ui';

import {
  font,
  radius,
  space,
  tabularDigits,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';

export type StatTileProps = Readonly<{
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  width?: number;
  tone?: 'default' | 'high';
}>;

/** A muted label over one large tabular number, with an optional unit and caption. */
export function StatTile({
  label,
  value,
  unit,
  caption,
  width,
  tone = 'default',
}: StatTileProps) {
  const colors = useColors();
  const muted = { ...font.caption, color: textColor(colors.onSurfaceVariant) };

  return (
    <Column
      spacing={space.xs}
      style={{
        width,
        padding: space.lg,
        borderRadius: radius.card,
        backgroundColor:
          tone === 'high'
            ? colors.surfaceContainerHigh
            : colors.surfaceContainer,
      }}
    >
      <Text textStyle={muted}>{label}</Text>
      <Row alignment="end" spacing={space.xs}>
        <Text
          textStyle={{ ...font.stat, color: textColor(colors.onSurface) }}
          modifiers={tabularDigits()}
        >
          {value}
        </Text>
        {unit ? <Text textStyle={muted}>{unit}</Text> : null}
      </Row>
      {caption ? <Text textStyle={muted}>{caption}</Text> : null}
    </Column>
  );
}

/** Equal-width `StatTile`s across the content column. */
export function StatRow({
  tiles,
}: Readonly<{ tiles: readonly StatTileProps[] }>) {
  const tileWidth =
    (useContentWidth() - space.md * (tiles.length - 1)) / tiles.length;

  return (
    <Row spacing={space.md}>
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} width={tileWidth} />
      ))}
    </Row>
  );
}
