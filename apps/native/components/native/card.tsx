import ChevronRightIcon from '@expo/material-symbols/chevron_right.xml';
import { Column, Icon, ListItem, type ListItemProps } from '@expo/ui';
import { Children, isValidElement, type ReactNode } from 'react';

import { fullWidthSurface, radius, useColors } from '@/lib/ui';

const CHEVRON = { ios: 'chevron.right', android: ChevronRightIcon } as const;

export type CardProps = Readonly<{
  children: ReactNode;
  /** Inner padding; 0 for cards of `CardRow`s, which carry their own. */
  padding?: number;
  spacing?: number;
  tone?: 'default' | 'high';
  /** Separates each child with a `Hairline`. */
  divided?: boolean;
}>;

/** A grouped, rounded, full-width `surfaceContainer` surface. */
export function Card({
  children,
  padding = 0,
  spacing = 0,
  tone = 'default',
  divided = false,
}: CardProps) {
  const colors = useColors();
  const surface = fullWidthSurface({
    padding,
    borderRadius: radius.card,
    backgroundColor:
      tone === 'high' ? colors.surfaceContainerHigh : colors.surfaceContainer,
  });

  return (
    <Column spacing={spacing} {...surface}>
      {divided
        ? Children.toArray(children).flatMap((child, index) =>
            index === 0
              ? [child]
              : [
                  <Hairline
                    key={`hairline-${isValidElement(child) ? (child.key ?? index) : index}`}
                  />,
                  child,
                ]
          )
        : children}
    </Column>
  );
}

export type CardRowProps = ListItemProps & Readonly<{ chevron?: boolean }>;

/** A row inside a `Card`: a transparent `ListItem`, optionally with a trailing chevron. */
export function CardRow({
  chevron = false,
  colors: rowColors,
  trailing,
  ...props
}: CardRowProps) {
  const colors = useColors();

  return (
    <ListItem
      {...props}
      colors={{ containerColor: 'transparent', ...rowColors }}
      trailing={
        trailing ??
        (chevron ? (
          <Icon name={CHEVRON} size={20} color={colors.onSurfaceVariant} />
        ) : undefined)
      }
    />
  );
}

/** A full-width `outlineVariant` rule between rows. */
export function Hairline() {
  const colors = useColors();

  return (
    <Column
      {...fullWidthSurface({
        height: 1,
        backgroundColor: colors.outlineVariant,
      })}
    />
  );
}
