import LockIcon from '@expo/material-symbols/lock.xml';
import {
  Button,
  Column,
  Icon,
  RNHostView,
  Row,
  ScrollView,
  Text,
} from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityElement,
  accessibilityLabel,
} from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { presenceOf } from '@repo/backend/convex/domain/presence';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { MemberActionsSheet } from '@/components/groups/member-actions-sheet';
import { ExerciseTile } from '@/components/workout/exercise-strip';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { THEME, useAppearance } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { formatClock, formatWeight } from '@/lib/workout/format';

type GroupView = NonNullable<FunctionReturnType<typeof api.groups.getMine>>;
type MemberBox = GroupView['members'][number];

const SCREEN_PADDING = 24;
const GAP = 12;
const AVATAR = 32;
const LOCK = { ios: 'lock.fill', android: LockIcon } as const;
const ACTIONS_WIDTH = 44;
/** Tall enough for a full box, so a lone member's box never clips its content. */
const MIN_FILL_HEIGHT = 460;

function statusText(progress: MemberBox['progress'], now: number): string {
  switch (progress.status) {
    case 'not_started':
      return 'Not started';
    case 'finished':
      return 'Finished';
    default:
      return progress.restEndsAt !== null && progress.restEndsAt > now
        ? `Resting ${formatClock((progress.restEndsAt - now) / 1000)}`
        : 'Working';
  }
}

function Avatar({ box }: Readonly<{ box: MemberBox }>) {
  const { resolvedAppearance } = useAppearance();
  if (box.image) {
    return (
      <RNHostView matchContents>
        <Image
          accessibilityLabel={`${box.username}'s photo`}
          source={{ uri: box.image }}
          style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }}
        />
      </RNHostView>
    );
  }
  return (
    <Column
      alignment="center"
      style={{
        width: AVATAR,
        height: AVATAR,
        borderRadius: AVATAR / 2,
        backgroundColor: THEME[resolvedAppearance].muted,
        paddingTop: 7,
      }}
    >
      <Text textStyle={{ fontSize: 13, fontWeight: '700' }}>
        {box.username.slice(0, 2).toUpperCase()}
      </Text>
    </Column>
  );
}

function MemberBoxView({
  box,
  width,
  headerHeight,
  fillHeight,
  compact,
  units,
  now,
  isHost,
}: Readonly<{
  box: MemberBox;
  width: number;
  headerHeight: number;
  fillHeight: number | null;
  compact: boolean;
  units: WeightUnit;
  now: number;
  isHost: boolean;
}>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const [actionsPresented, setActionsPresented] = useState(false);
  const { progress } = box;
  const reconnecting = presenceOf(box.lastSeenAt, now) === 'reconnecting';
  const pace =
    progress.setsPlanned === 0 ? 0 : progress.setsDone / progress.setsPlanned;
  const tag = box.isYou
    ? box.isHost
      ? 'You · Group host'
      : 'You'
    : box.isHost
      ? 'Group host'
      : 'Group member';
  const currentExercise =
    progress.currentExercise && progress.setCount > 0
      ? `${progress.currentExercise} · Set ${progress.setNumber} of ${progress.setCount}`
      : progress.currentExercise;
  const currentSet = progress.currentSet;
  const setValue = currentSet
    ? `${currentSet.weightKg === null ? 'No weight' : formatWeight(currentSet.weightKg, units)} × ${currentSet.reps === null ? 'No reps' : `${currentSet.reps} reps`}`
    : 'No Set logged yet';
  const targetResults = progress.exercises.flatMap((exercise) =>
    exercise.targetMet === null
      ? []
      : [`${exercise.name}: target ${exercise.targetMet ? 'met' : 'missed'}`]
  );
  const routineLine =
    progress.startedAt === null
      ? 'Not started'
      : [
          progress.routineName,
          progress.status === 'finished'
            ? null
            : formatClock((now - progress.startedAt) / 1000),
        ]
          .filter(Boolean)
          .join(' · ');
  const label = [
    box.username,
    tag,
    reconnecting ? 'Reconnecting' : routineLine,
    reconnecting ? null : statusText(progress, now),
    `Pace ${Math.round(pace * 100)}%`,
    currentExercise,
    ...targetResults,
    progress.weightsShown ? setValue : 'Weights hidden',
    progress.weightsShown && progress.volumeKg !== null
      ? `Volume ${formatWeight(progress.volumeKg, units)}`
      : null,
  ]
    .filter(Boolean)
    .join(', ');
  const textWidth = Math.max(
    48,
    width - 24 - AVATAR - 8 - (box.isYou ? 0 : ACTIONS_WIDTH + 8)
  );

  return (
    <>
      <Column
        spacing={8}
        modifiers={
          Platform.OS === 'ios'
            ? [accessibilityElement('contain'), accessibilityLabel(label)]
            : [semantics({ contentDescription: label })]
        }
        style={{
          width,
          height: fillHeight ?? undefined,
          padding: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Column style={{ height: headerHeight }}>
          <Row spacing={8} alignment="start">
            <Avatar box={box} />
            <Column spacing={4} style={{ width: textWidth }}>
              <Text
                numberOfLines={1}
                textStyle={{ fontSize: 15, fontWeight: '700' }}
              >
                {box.username}
              </Text>
              <Text
                numberOfLines={1}
                textStyle={{ fontSize: 12, color: colors.mutedForeground }}
              >
                {tag}
              </Text>
              <Text
                numberOfLines={1}
                textStyle={{ fontSize: 12, color: colors.mutedForeground }}
              >
                {reconnecting ? 'Reconnecting…' : routineLine}
              </Text>
            </Column>
            {!box.isYou ? (
              <Button
                label="…"
                modifiers={[
                  accessibilityModifier(`Actions for ${box.username}`),
                ]}
                onPress={() => setActionsPresented(true)}
                variant="text"
              />
            ) : null}
          </Row>
        </Column>
        <Column
          style={{
            height: 1,
            width: width - 24,
            backgroundColor: colors.border,
          }}
        />
        {compact ? (
          <Text
            numberOfLines={1}
            style={{ opacity: reconnecting ? 0.45 : 1 }}
            textStyle={{ fontSize: 14 }}
          >
            {currentExercise ?? statusText(progress, now)}
          </Text>
        ) : (
          <Column spacing={8} style={{ opacity: reconnecting ? 0.45 : 1 }}>
            <Column spacing={4}>
              <RNHostView matchContents style={{ width: width - 24 }}>
                <WorkoutProgress fraction={pace} />
              </RNHostView>
              <Text
                textStyle={{ fontSize: 12, color: colors.mutedForeground }}
              >{`Pace ${Math.round(pace * 100)}%`}</Text>
            </Column>
            <Text textStyle={{ fontSize: 15, fontWeight: '600' }}>
              {statusText(progress, now)}
            </Text>
            {currentExercise ? (
              <Text textStyle={{ fontSize: 14 }}>{currentExercise}</Text>
            ) : null}
            {progress.weightsShown ? (
              <Column spacing={4}>
                <Text textStyle={{ fontSize: 15, fontWeight: '600' }}>
                  {setValue}
                </Text>
                {progress.volumeKg !== null ? (
                  <Text
                    textStyle={{ fontSize: 12, color: colors.mutedForeground }}
                  >{`Volume ${formatWeight(progress.volumeKg, units)}`}</Text>
                ) : null}
              </Column>
            ) : (
              <Row spacing={6} alignment="center">
                <Icon
                  name={LOCK}
                  size={14}
                  color={colors.mutedForeground}
                  accessibilityLabel="Weights hidden"
                />
                <Text
                  textStyle={{ fontSize: 13, color: colors.mutedForeground }}
                >
                  Weights hidden
                </Text>
              </Row>
            )}
            {progress.exercises.length > 0 ? (
              <ScrollView
                direction="horizontal"
                showsIndicators={false}
                style={{ width: width - 24 }}
              >
                <Row spacing={8}>
                  {progress.exercises.map((exercise, index) => (
                    <Column
                      // biome-ignore lint/suspicious/noArrayIndexKey: Exercises retain their ordered positions in the summary
                      key={index}
                      spacing={4}
                      style={{ width: 116 }}
                    >
                      <ExerciseTile
                        exercise={{
                          key: String(index),
                          name: exercise.name,
                          sets: exercise.pips.map((pip) => ({
                            done: pip === 'done',
                            current: pip === 'current',
                          })),
                        }}
                        pipVariant="group"
                      />
                      {exercise.targetMet !== null ? (
                        <Text
                          modifiers={[
                            accessibilityModifier(
                              `${exercise.name}: target ${exercise.targetMet ? 'met' : 'missed'}`
                            ),
                          ]}
                          textStyle={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          {exercise.targetMet
                            ? '✓ target met'
                            : '✗ target missed'}
                        </Text>
                      ) : null}
                    </Column>
                  ))}
                </Row>
              </ScrollView>
            ) : null}
          </Column>
        )}
      </Column>
      {!box.isYou ? (
        <MemberActionsSheet
          username={box.username}
          isHost={isHost}
          isPresented={actionsPresented}
          onDismiss={() => setActionsPresented(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Member boxes share a fixed, font-scaled header height so row dividers align.
 * A lone member's box fills the screen below `reservedHeight` of surrounding chrome.
 */
export function GroupGrid({
  members,
  now,
  isHost,
  reservedHeight,
}: Readonly<{
  members: readonly MemberBox[];
  now: number;
  isHost: boolean;
  reservedHeight: number;
}>) {
  const settings = useQuery(api.memberSettings.get);
  const { width, height, fontScale } = useWindowDimensions();
  const fullWidth = width - SCREEN_PADDING * 2;
  const halfWidth = (fullWidth - GAP) / 2;
  const headerHeight = 76 * Math.max(1, fontScale);
  const fillHeight = Math.max(
    MIN_FILL_HEIGHT * Math.max(1, fontScale),
    height - reservedHeight
  );
  const compact = members.length >= 9;
  const units = settings?.units ?? 'kg';

  if (members.length <= 2) {
    return (
      <Column spacing={GAP}>
        {members.map((box) => (
          <MemberBoxView
            fillHeight={members.length === 1 ? fillHeight : null}
            key={box.username}
            box={box}
            width={fullWidth}
            headerHeight={headerHeight}
            compact={compact}
            units={units}
            now={now}
            isHost={isHost}
          />
        ))}
      </Column>
    );
  }

  const rows: MemberBox[][] = [];
  for (let index = 0; index < members.length; index += 2) {
    rows.push(members.slice(index, index + 2));
  }
  return (
    <Column spacing={GAP}>
      {rows.map((row) => (
        <Row
          key={row.map((box) => box.username).join('|')}
          spacing={GAP}
          alignment="start"
        >
          {row.map((box) => (
            <MemberBoxView
              fillHeight={null}
              key={box.username}
              box={box}
              width={halfWidth}
              headerHeight={headerHeight}
              compact={compact}
              units={units}
              now={now}
              isHost={isHost}
            />
          ))}
        </Row>
      ))}
    </Column>
  );
}
