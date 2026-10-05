import {
  Button,
  Column,
  RNHostView,
  Row,
  ScrollView,
  Spacer,
  Text,
} from '@expo/ui';
import type { api } from '@repo/backend/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Text as NativeText, useWindowDimensions, View } from 'react-native';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { THEME, useAppearance } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { formatClock } from '@/lib/workout/format';

type GroupView = NonNullable<FunctionReturnType<typeof api.groups.getMine>>;

type GroupHeaderProps = {
  group: GroupView;
  now: number;
  variant: 'full' | 'compact';
  collapsed?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  onInvite?: () => void;
  menu: ReactNode;
};

const AVATAR_SIZE = 40;
const AVATAR_OVERLAP = 12;

function MemberAvatars({
  group,
  width,
}: Readonly<{ group: GroupView; width: number }>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  return (
    <ScrollView
      direction="horizontal"
      showsIndicators={false}
      style={{ width }}
    >
      <RNHostView matchContents>
        <View
          accessible
          accessibilityLabel={`Group members: ${group.members.map((member) => member.username).join(', ')}`}
          style={{
            flexDirection: 'row',
            width:
              AVATAR_SIZE +
              Math.max(0, group.members.length - 1) *
                (AVATAR_SIZE - AVATAR_OVERLAP) +
              AVATAR_OVERLAP,
            height: AVATAR_SIZE,
            paddingRight: AVATAR_OVERLAP,
          }}
        >
          {group.members.map((member, index) => (
            <View
              key={member.username}
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                marginLeft: index === 0 ? 0 : -AVATAR_OVERLAP,
                borderRadius: AVATAR_SIZE / 2,
                borderWidth: 2,
                borderColor: colors.background,
                backgroundColor: colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {member.image ? (
                <Image
                  source={{ uri: member.image }}
                  style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                />
              ) : (
                <NativeText
                  allowFontScaling={false}
                  style={{
                    color: colors.foreground,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {member.username.slice(0, 2).toUpperCase()}
                </NativeText>
              )}
            </View>
          ))}
        </View>
      </RNHostView>
    </ScrollView>
  );
}

/** The full-screen and drawer headers share member identity and actions. */
export function GroupHeader({
  group,
  now,
  variant,
  collapsed = false,
  onBack,
  onClose,
  onExpand,
  onInvite,
  menu,
}: Readonly<GroupHeaderProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const { width } = useWindowDimensions();
  const together = `${formatClock((now - group.createdAt) / 1000)} together`;
  const yourProgress = group.members.find((member) => member.isYou)?.progress;
  const yourPace =
    yourProgress && yourProgress.setsPlanned > 0
      ? yourProgress.setsDone / yourProgress.setsPlanned
      : 0;
  const groupPace =
    group.members.length === 0
      ? 0
      : group.members.reduce(
          (total, member) =>
            total +
            (member.progress.setsPlanned > 0
              ? member.progress.setsDone / member.progress.setsPlanned
              : 0),
          0
        ) / group.members.length;
  const paceWidth = Math.max(100, (width - 64) / 2);

  if (variant === 'compact') {
    return (
      <Column spacing={8}>
        <Row spacing={8} alignment="center">
          <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Group</Text>
          <Spacer />
          {onExpand ? (
            <Button label="Expand" variant="text" onPress={onExpand} />
          ) : null}
          {onClose ? (
            <Button label="Close" variant="text" onPress={onClose} />
          ) : null}
        </Row>
        <MemberAvatars group={group} width={width - 48} />
        {menu}
      </Column>
    );
  }

  if (collapsed) {
    return (
      <Column spacing={8}>
        <Row spacing={12} alignment="center">
          <Column style={{ width: Math.max(80, width - 200) }}>
            <MemberAvatars group={group} width={Math.max(80, width - 200)} />
          </Column>
          <Text textStyle={{ fontSize: 14, fontWeight: '600' }}>
            {together}
          </Text>
        </Row>
        {menu}
      </Column>
    );
  }

  return (
    <Column spacing={12}>
      <Row spacing={8} alignment="center">
        {onBack ? (
          <Button
            label="Workout"
            variant="text"
            modifiers={[accessibilityModifier('Back to your Workout')]}
            onPress={onBack}
          />
        ) : null}
        <Spacer />
        {onInvite ? <Button label="Invite" onPress={onInvite} /> : null}
      </Row>
      <MemberAvatars group={group} width={width - 48} />
      <Text textStyle={{ fontSize: 18, fontWeight: '700' }}>
        {group.members.map((member) => member.username).join(', ')}
      </Text>
      <Text textStyle={{ fontSize: 15, color: colors.mutedForeground }}>
        {`${yourProgress?.routineName ?? 'Your Workout'} · ${together}`}
      </Text>
      {menu}
      <Row spacing={16}>
        <Column spacing={6} style={{ width: paceWidth }}>
          <Text
            textStyle={{ fontSize: 14, fontWeight: '600' }}
          >{`Your Pace ${Math.round(yourPace * 100)}%`}</Text>
          <RNHostView matchContents style={{ width: paceWidth }}>
            <WorkoutProgress fraction={yourPace} />
          </RNHostView>
        </Column>
        <Column spacing={6} style={{ width: paceWidth }}>
          <Text
            textStyle={{ fontSize: 14, fontWeight: '600' }}
          >{`Group average Pace ${Math.round(groupPace * 100)}%`}</Text>
          <RNHostView matchContents style={{ width: paceWidth }}>
            <WorkoutProgress fraction={groupPace} />
          </RNHostView>
        </Column>
      </Row>
    </Column>
  );
}
