import ChevronRightIcon from '@expo/material-symbols/chevron_right.xml';
import { Column, Icon, ListItem, type ListItemProps } from '@expo/ui';
import { alpha } from '@expo/ui/jetpack-compose/modifiers';
import {
  disabled as swiftDisabled,
  opacity as swiftOpacity,
  padding as swiftPadding,
} from '@expo/ui/swift-ui/modifiers';
import { Children, isValidElement, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { fullWidthSurface, radius, space, useColors } from '@/lib/ui';

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

export type CardRowProps = ListItemProps &
  Readonly<{
    chevron?: boolean;
    /** Dims the row and ignores taps. */
    disabled?: boolean;
  }>;

/**
 * Material `ListItem` carries 16dp/8dp insets on Android; the iOS `ListItem`
 * is a bare `Button`, so the row inset is added here.
 */
const ROW_INSET =
  Platform.OS === 'ios'
    ? [swiftPadding({ horizontal: space.lg, vertical: space.md })]
    : [];

/** Material's disabled content opacity. */
const DISABLED_OPACITY = 0.38;
const DISABLED =
  Platform.OS === 'ios'
    ? [swiftDisabled(true), swiftOpacity(DISABLED_OPACITY)]
    : [alpha(DISABLED_OPACITY)];

/** A row inside a `Card`: a transparent `ListItem`, optionally with a trailing chevron. */
export function CardRow({
  chevron = false,
  disabled = false,
  colors: rowColors,
  trailing,
  modifiers,
  onPress,
  ...props
}: CardRowProps) {
  const colors = useColors();

  return (
    <ListItem
      {...props}
      onPress={disabled ? undefined : onPress}
      modifiers={[
        ...ROW_INSET,
        ...(modifiers ?? []),
        ...(disabled ? DISABLED : []),
      ]}
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
