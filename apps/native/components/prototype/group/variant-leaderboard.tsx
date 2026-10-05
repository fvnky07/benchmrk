// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant B "Leaderboard": a compact header, then members as full-width rows
// ranked by Pace, each with a slim bar and a fist bump at the row end; the
// Group menu is a pill chip row and the activity feed sits under the list.
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
import {
  ActivityFeed,
  BumpButton,
  type GroupFeed,
  latestBumpable,
  useGroupFeed,
} from './activity';
import {
  exerciseLine,
  type GroupActions,
  type GroupMember,
  type GroupModel,
  groupMenu,
  paceOf,
  rankedByPace,
  restRemaining,
  statusText,
  volumeLine,
} from './model';
import {
  ActionChips,
  Avatar,
  BackButton,
  Bar,
  Block,
  Hairline,
  InviteButton,
  NativeColumn,
  SCREEN_PADDING,
  ScreenTitle,
  SectionTitle,
  TABULAR,
  useMemberActions,
  WeightsRow,
} from './parts';

function LeaderRow({
  member,
  rank,
  model,
  feed,
}: Readonly<{
  member: GroupMember;
  rank: number;
  model: GroupModel;
  feed: GroupFeed;
}>) {
  const colors = useColors();
  const { open, sheet } = useMemberActions(member, model.isHost);
  const { progress } = member;
  const { now, units } = model;
  const reconnecting = presenceOf(member.lastSeenAt, now) === 'reconnecting';
  const pace = paceOf(progress);
  const resting = restRemaining(progress, now) !== null;
  const detail = reconnecting
    ? 'Reconnecting…'
    : [
        resting ? statusText(progress, now) : null,
        exerciseLine(progress) ?? (resting ? null : statusText(progress, now)),
      ]
        .filter(Boolean)
        .join(' · ');
  const tag = member.isYou
    ? member.isHost
      ? 'You · Host'
      : 'You'
    : member.isHost
      ? 'Host'
      : null;
  const volume = volumeLine(progress, units);
  const secondary = progress.weightsShown
    ? (volume ?? '—')
    : progress.setsPlanned > 0
      ? `${progress.setsDone}/${progress.setsPlanned} sets`
      : 'Weights hidden';

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: member.isYou
            ? colors.surfaceContainerHigh
            : undefined,
          opacity: reconnecting ? 0.45 : 1,
        }}
      >
        <Pressable
          accessibilityHint={
            open ? `Actions for ${member.username}` : undefined
          }
          accessibilityLabel={`${rank}. ${member.username}${tag ? `, ${tag}` : ''}, Pace ${Math.round(pace * 100)}%, ${detail}`}
          disabled={!open}
          onPress={open}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text
            style={{
              width: 20,
              textAlign: 'center',
              color: colors.onSurfaceVariant,
              fontSize: 15,
              fontWeight: '700',
              fontVariant: TABULAR,
            }}
          >
            {rank}
          </Text>
          <Avatar member={member} size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  color: colors.onSurface,
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                {member.username}
              </Text>
              {tag ? (
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                  {tag}
                </Text>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={{ color: colors.onSurfaceVariant, fontSize: 13 }}
            >
              {detail}
            </Text>
            <Bar fraction={pace} />
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 56, gap: 2 }}>
            <Text
              style={{
                color: colors.onSurface,
                fontSize: 17,
                fontWeight: '700',
                fontVariant: TABULAR,
              }}
            >
              {`${Math.round(pace * 100)}%`}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.onSurfaceVariant,
                fontSize: 13,
                fontVariant: TABULAR,
              }}
            >
              {secondary}
            </Text>
          </View>
        </Pressable>
        <View style={{ width: 40 }}>
          {member.isYou ? null : (
            <BumpButton
              event={latestBumpable(feed.events, member.username)}
              feed={feed}
              username={member.username}
            />
          )}
        </View>
      </View>
      {sheet}
    </>
  );
}

export function VariantLeaderboard({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const feed = useGroupFeed();
  const { group, now, members } = model;
  const contentWidth = width - SCREEN_PADDING * 2;
  const count = members.length;
  const together = `${formatClock((now - group.createdAt) / 1000)} together`;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: SCREEN_PADDING,
        paddingBottom: 48,
      }}
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
        <BackButton onPress={actions.onBack} />
        <InviteButton onPress={actions.onInvite} />
      </View>
      <View style={{ marginTop: 8 }}>
        <ScreenTitle
          subtitle={`${count} ${count === 1 ? 'member' : 'members'} · ${together}`}
          title="Group workout"
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <ActionChips menu={groupMenu(model, actions)} />
      </View>

      <View style={{ marginTop: 24, gap: 10 }}>
        <SectionTitle trailing="Ranked by Pace">Leaderboard</SectionTitle>
        <Block>
          {rankedByPace(members).map((member, index) => (
            <View key={member.username}>
              {index > 0 ? <Hairline /> : null}
              <LeaderRow
                feed={feed}
                member={member}
                model={model}
                rank={index + 1}
              />
            </View>
          ))}
        </Block>
        <Block>
          <WeightsRow actions={actions} model={model} />
        </Block>
      </View>

      {feed.events.length > 0 ? (
        <View style={{ marginTop: 24, gap: 10 }}>
          <SectionTitle>Activity</SectionTitle>
          <ActivityFeed
            feed={feed}
            layout="list"
            limit={10}
            members={members}
            now={now}
          />
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <NativeColumn width={contentWidth}>{model.status}</NativeColumn>
      </View>
    </ScrollView>
  );
}
