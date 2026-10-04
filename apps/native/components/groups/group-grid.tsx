import { Column, RNHostView, Row, Spacer, Text } from '@expo/ui';
import type { api } from '@repo/backend/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useWindowDimensions } from 'react-native';

import { WorkoutProgress } from '@/components/workout/workout-progress';
import { THEME, useAppearance } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';

type GroupView = NonNullable<FunctionReturnType<typeof api.groups.getMine>>;
type MemberBox = GroupView['members'][number];

const SCREEN_PADDING = 24;
const GAP = 12;
const AVATAR = 32;

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
  minHeight,
  now,
}: Readonly<{
  box: MemberBox;
  width: number;
  minHeight?: number;
  now: number;
}>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const { progress } = box;
  const pace =
    progress.setsPlanned === 0 ? 0 : progress.setsDone / progress.setsPlanned;
  const tag = box.isYou
    ? box.isHost
      ? 'You · Host'
      : 'You'
    : box.isHost
      ? 'Host'
      : (progress.routineName ?? '');

  return (
    <Column
      spacing={8}
      style={{
        width,
        height: minHeight,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Row spacing={8} alignment="center">
        <Avatar box={box} />
        <Column spacing={0}>
          <Text textStyle={{ fontSize: 15, fontWeight: '700' }}>
            {box.username}
          </Text>
          <Text textStyle={{ fontSize: 12, color: colors.mutedForeground }}>
            {tag}
          </Text>
        </Column>
        <Spacer />
        <Text textStyle={{ fontSize: 12, color: colors.mutedForeground }}>
          {progress.startedAt === null
            ? ''
            : formatClock((now - progress.startedAt) / 1000)}
        </Text>
      </Row>
      <Column spacing={2}>
        <WorkoutProgress fraction={pace} />
        <Text textStyle={{ fontSize: 12, color: colors.mutedForeground }}>
          {`Pace ${Math.round(pace * 100)}%`}
        </Text>
      </Column>
      <Text textStyle={{ fontSize: 15, fontWeight: '600' }}>
        {statusText(progress, now)}
      </Text>
      {progress.currentExercise ? (
        <Text textStyle={{ fontSize: 14 }}>{progress.currentExercise}</Text>
      ) : null}
      {progress.setCount > 0 ? (
        <Text textStyle={{ fontSize: 14, color: colors.mutedForeground }}>
          {`Set ${progress.setNumber} of ${progress.setCount}`}
        </Text>
      ) : null}
    </Column>
  );
}

/**
 * Member boxes, yours first: one fills the screen, two stack, three or four
 * form a 2×2 and more scroll in two columns.
 */
export function GroupGrid({
  members,
  now,
}: Readonly<{ members: readonly MemberBox[]; now: number }>) {
  const { width, height } = useWindowDimensions();
  const fullWidth = width - SCREEN_PADDING * 2;
  const halfWidth = (fullWidth - GAP) / 2;

  if (members.length <= 2) {
    return (
      <Column spacing={GAP}>
        {members.map((box) => (
          <MemberBoxView
            key={box.username}
            box={box}
            width={fullWidth}
            minHeight={members.length === 1 ? height * 0.5 : undefined}
            now={now}
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
        <Row key={row.map((box) => box.username).join('|')} spacing={GAP}>
          {row.map((box) => (
            <MemberBoxView
              key={box.username}
              box={box}
              width={halfWidth}
              now={now}
            />
          ))}
        </Row>
      ))}
    </Column>
  );
}
