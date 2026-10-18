import FormatListBulletedIcon from '@expo/material-symbols/format_list_bulleted.xml';
import MoreHorizIcon from '@expo/material-symbols/more_horiz.xml';
import {
  Column,
  Icon,
  type IconProps,
  Row,
  Spacer,
  Text,
  type UniversalBaseProps,
} from '@expo/ui';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  accessibilityModifier,
  font,
  space,
  tabularDigits,
  textColor,
  useColors,
} from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';

type ModifierConfig = NonNullable<UniversalBaseProps['modifiers']>[number];

const EXERCISES = {
  ios: 'list.bullet',
  android: FormatListBulletedIcon,
} as const;
const MORE = { ios: 'ellipsis', android: MoreHorizIcon } as const;
const BUTTON_SIZE = 40;

/**
 * Lets a `Row` child take the width its siblings leave, like `flex: 1`.
 * Compose measures Row children in order, so without a weight a long text
 * would squeeze out the controls after it; SwiftUI needs a flexible frame.
 */
export function fillRowWidth(): ModifierConfig[] {
  return Platform.OS === 'android'
    ? [weight(1)]
    : [frame({ maxWidth: Number.POSITIVE_INFINITY, alignment: 'leading' })];
}

/** A round 40pt button holding one icon. */
function IconButton({
  icon,
  label,
  onPress,
}: Readonly<{ icon: IconProps['name']; label: string; onPress: () => void }>) {
  const colors = useColors();

  return (
    <Column
      alignment="center"
      onPress={onPress}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: colors.surfaceContainerHigh,
      }}
      modifiers={[accessibilityModifier(label)]}
    >
      {/* A universal Column only centres across; the spacers centre along. */}
      <Spacer flexible />
      <Icon name={icon} size={20} color={colors.onSurface} />
      <Spacer flexible />
    </Column>
  );
}

type WorkoutTopBarProps = {
  /** Seconds since the Workout started. */
  elapsedSeconds: number;
  workoutName: string;
  /** The rest pill; null while there's no Exercise to rest between. */
  rest: ReactNode;
  onOpenExercises: () => void;
  onOpenMenu: () => void;
};

/**
 * The compact bar fixed above the Workout: elapsed time and name, the rest
 * pill, Exercises and the Workout menu.
 */
export function WorkoutTopBar({
  elapsedSeconds,
  workoutName,
  rest,
  onOpenExercises,
  onOpenMenu,
}: Readonly<WorkoutTopBarProps>) {
  const colors = useColors();

  return (
    <Row alignment="center" spacing={space.sm}>
      <Column modifiers={fillRowWidth()}>
        <Text
          textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
          modifiers={tabularDigits()}
        >
          {formatClock(elapsedSeconds)}
        </Text>
        <Text
          numberOfLines={1}
          textStyle={{
            ...font.caption,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          {workoutName}
        </Text>
      </Column>
      {rest}
      <IconButton
        icon={EXERCISES}
        label="Exercises"
        onPress={onOpenExercises}
      />
      <IconButton icon={MORE} label="Workout menu" onPress={onOpenMenu} />
    </Row>
  );
}
