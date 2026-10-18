import PersonAddIcon from '@expo/material-symbols/person_add.xml';
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
import { Text as NativeText, View } from 'react-native';
import { Card } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import {
  font,
  space,
  tabularDigits,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { formatClock } from '@/lib/workout/format';

type GroupView = NonNullable<FunctionReturnType<typeof api.groups.getMine>>;

type GroupHeaderProps = {
  group: GroupView;
  now: number;
  variant: 'full' | 'compact';
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  onInvite?: () => void;
  menu: ReactNode;
};

const AVATAR_SIZE = 40;
const AVATAR_OVERLAP = 12;
const INVITE_ICON = {
  ios: 'person.badge.plus',
  android: PersonAddIcon,
} as const;

function MemberAvatars({
  group,
  width,
}: Readonly<{ group: GroupView; width: number }>) {
  const colors = useColors();
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
                borderColor: colors.surface,
                backgroundColor: colors.surfaceContainerHigh,
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
                    color: colors.onSurface,
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

/** A labelled pace bar: label and percentage above the progress track. */
function PaceBar({
  label,
  fraction,
  width,
}: Readonly<{ label: string; fraction: number; width: number }>) {
  const colors = useColors();
  return (
    <Column spacing={6}>
      <Row alignment="center" style={{ width }}>
        <Text
          textStyle={{
            ...font.label,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          {label}
        </Text>
        <Spacer flexible />
        <Text
          modifiers={tabularDigits()}
          textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
        >{`${Math.round(fraction * 100)}%`}</Text>
      </Row>
      <RNHostView matchContents style={{ width }}>
        <WorkoutProgress fraction={fraction} />
      </RNHostView>
    </Column>
  );
}

/** The full-screen and drawer headers share member identity and actions. */
export function GroupHeader({
  group,
  now,
  variant,
  onBack,
  onClose,
  onExpand,
  onInvite,
  menu,
}: Readonly<GroupHeaderProps>) {
  const colors = useColors();
  const contentWidth = useContentWidth();
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

  if (variant === 'compact') {
    return (
      <Column spacing={space.md}>
        <Row
          spacing={space.sm}
          alignment="center"
          style={{ width: contentWidth }}
        >
          <Text
            textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
          >
            Group
          </Text>
          <Spacer flexible />
          {onExpand ? (
            <Button label="Expand" variant="text" onPress={onExpand} />
          ) : null}
          {onClose ? (
            <Button label="Close" variant="text" onPress={onClose} />
          ) : null}
        </Row>
        <MemberAvatars group={group} width={contentWidth} />
        {menu}
      </Column>
    );
  }

  return (
    <Column spacing={space.lg}>
      {onBack || onInvite ? (
        <Row
          spacing={space.sm}
          alignment="center"
          style={{ width: contentWidth }}
        >
          {onBack ? (
            <Button
              label="Workout"
              variant="text"
              modifiers={[accessibilityModifier('Back to your Workout')]}
              onPress={onBack}
            />
          ) : null}
          <Spacer flexible />
          {onInvite ? (
            <PillChip
              icon={INVITE_ICON}
              label="Invite"
              selected
              onPress={onInvite}
            />
          ) : null}
        </Row>
      ) : null}
      <Column spacing={space.md}>
        <MemberAvatars group={group} width={contentWidth} />
        <Column spacing={2}>
          <Text
            textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
          >
            {group.members.map((member) => member.username).join(', ')}
          </Text>
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            {`${yourProgress?.routineName ?? 'Your Workout'} · ${together}`}
          </Text>
        </Column>
      </Column>
      <Card padding={space.lg} spacing={space.md}>
        <PaceBar
          label="Your Pace"
          fraction={yourPace}
          width={contentWidth - space.lg * 2}
        />
        <PaceBar
          label="Group average Pace"
          fraction={groupPace}
          width={contentWidth - space.lg * 2}
        />
      </Card>
      {menu}
    </Column>
  );
}
