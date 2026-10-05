// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant D "Spotlight": your own Workout is a hero card with Resume, the
// other members are a horizontal carousel of compact cards, and the Group
// activity feed with fist bumps is the main vertical content.
import { presenceOf } from '@repo/backend/convex/domain/presence';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { useColors } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { ActivityFeed, useGroupFeed } from './activity';
import {
  elapsedClock,
  exerciseLine,
  type GroupActions,
  type GroupMember,
  type GroupModel,
  groupMenu,
  paceOf,
  setLine,
  statusText,
} from './model';
import {
  ActionList,
  Avatar,
  Bar,
  Chip,
  InviteButton,
  NativeColumn,
  PrimaryButton,
  SCREEN_PADDING,
  ScreenTitle,
  SectionTitle,
  TABULAR,
  useMemberActions,
} from './parts';

const CARD_WIDTH = 160;
const CARD_GAP = 12;

function Hero({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const colors = useColors();
  const { selfProgress: progress, now, units } = model;
  const started = progress !== null && progress.startedAt !== null;
  const finished = progress?.status === 'finished';
  const pace = progress ? paceOf(progress) : 0;
  const exercise = progress ? exerciseLine(progress) : null;
  const weights = progress ? setLine(progress, units) : null;
  const elapsed = finished
    ? 'Done'
    : ((progress ? elapsedClock(progress, now) : null) ?? '–:––');
  const sets =
    progress && progress.setsPlanned > 0
      ? `${progress.setsDone}/${progress.setsPlanned}`
      : '–';
  const action = !started
    ? 'Choose a Workout'
    : finished
      ? 'Open Workout'
      : 'Resume';

  return (
    <View
      style={{
        borderRadius: 28,
        padding: 20,
        gap: 16,
        backgroundColor: colors.surfaceContainerHigh,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.8,
          }}
        >
          YOUR WORKOUT
        </Text>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 13,
            fontVariant: TABULAR,
          }}
        >
          {progress ? statusText(progress, now) : 'Not started'}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{ color: colors.onSurface, fontSize: 26, fontWeight: '800' }}
      >
        {progress?.routineName ?? 'Your Workout'}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            style={{
              color: colors.onSurface,
              fontSize: 48,
              fontWeight: '800',
              fontVariant: TABULAR,
            }}
          >
            {elapsed}
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
            Elapsed
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: colors.onSurface,
              fontSize: 28,
              fontWeight: '800',
              fontVariant: TABULAR,
            }}
          >
            {sets}
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
            {`Sets · ${Math.round(pace * 100)}% Pace`}
          </Text>
        </View>
      </View>
      <Bar
        fraction={pace}
        height={8}
        trackColor={colors.surfaceContainerHighest}
      />
      {exercise ? (
        <View style={{ gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.onSurface, fontSize: 17, fontWeight: '600' }}
          >
            {exercise}
          </Text>
          {weights ? (
            <Text
              style={{
                color: colors.onSurfaceVariant,
                fontSize: 15,
                fontVariant: TABULAR,
              }}
            >
              {weights}
            </Text>
          ) : null}
        </View>
      ) : null}
      <PrimaryButton label={action} onPress={actions.onBack} />
    </View>
  );
}

function MemberCard({
  member,
  model,
}: Readonly<{ member: GroupMember; model: GroupModel }>) {
  const colors = useColors();
  const { open, sheet } = useMemberActions(member, model.isHost);
  const { progress } = member;
  const { now } = model;
  const reconnecting = presenceOf(member.lastSeenAt, now) === 'reconnecting';
  const pace = paceOf(progress);
  const detail = reconnecting
    ? 'Reconnecting…'
    : (progress.currentExercise ?? statusText(progress, now));

  return (
    <>
      <Pressable
        accessibilityHint={`Actions for ${member.username}`}
        accessibilityLabel={`${member.username}, Pace ${Math.round(pace * 100)}%, ${detail}`}
        accessibilityRole="button"
        disabled={!open}
        onPress={open}
        style={({ pressed }) => ({
          width: CARD_WIDTH,
          padding: 14,
          gap: 12,
          borderRadius: 20,
          backgroundColor: colors.surfaceContainer,
          opacity: reconnecting ? 0.45 : pressed ? 0.85 : 1,
        })}
      >
        <Avatar member={member} size={40} />
        <View style={{ gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.onSurface, fontSize: 16, fontWeight: '700' }}
          >
            {member.username}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              minHeight: 34,
              color: colors.onSurfaceVariant,
              fontSize: 13,
            }}
          >
            {detail}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: colors.onSurface,
              fontSize: 20,
              fontWeight: '800',
              fontVariant: TABULAR,
            }}
          >
            {`${Math.round(pace * 100)}%`}
          </Text>
          <Bar fraction={pace} />
        </View>
      </Pressable>
      {sheet}
    </>
  );
}

export function VariantSpotlight({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const feed = useGroupFeed();
  const { group, now, members } = model;
  const contentWidth = width - SCREEN_PADDING * 2;
  const others = members.filter((member) => !member.isYou);
  const count = members.length;
  const together = `${formatClock((now - group.createdAt) / 1000)} together`;

  return (
    <ScrollView
      contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 48 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <NativeColumn width={contentWidth}>
        <InviteInbox />
      </NativeColumn>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <ScreenTitle
            subtitle={`${count} ${count === 1 ? 'member' : 'members'} · ${together}`}
            title="Group workout"
          />
        </View>
        <InviteButton onPress={actions.onInvite} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Hero actions={actions} model={model} />
      </View>

      <View style={{ marginTop: 28, gap: 12 }}>
        <SectionTitle trailing={`${count} in Group`}>Members</SectionTitle>
        <ScrollView
          contentContainerStyle={{
            gap: CARD_GAP,
            paddingHorizontal: SCREEN_PADDING,
          }}
          decelerationRate="fast"
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          style={{ marginHorizontal: -SCREEN_PADDING, flexGrow: 0 }}
        >
          {others.length === 0 ? (
            <View
              style={{
                width: contentWidth,
                padding: 20,
                gap: 12,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainer,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: colors.onSurface,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  Just you so far
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
                  Invite a friend to train together.
                </Text>
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Chip
                  label="Invite"
                  tone="primary"
                  onPress={actions.onInvite}
                />
              </View>
            </View>
          ) : (
            others.map((member) => (
              <MemberCard key={member.username} member={member} model={model} />
            ))
          )}
        </ScrollView>
      </View>

      <View style={{ marginTop: 28, gap: 12 }}>
        <SectionTitle>Activity</SectionTitle>
        <ActivityFeed
          feed={feed}
          layout="cards"
          limit={20}
          members={members}
          now={now}
        />
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <SectionTitle>Group</SectionTitle>
        <ActionList
          actions={actions}
          menu={groupMenu(model, actions)}
          model={model}
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <NativeColumn width={contentWidth}>{model.status}</NativeColumn>
      </View>
    </ScrollView>
  );
}
