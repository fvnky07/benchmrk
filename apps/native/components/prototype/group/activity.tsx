// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The Group activity feed with a different look: same query and fist bump
// mutation as `GroupActivity`, drawn as rows or cards on Material roles.
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { groupEventText } from '@/lib/groups/event-text';
import { useColors } from '@/lib/ui';
import { errorCode } from '@/lib/workout/format';
import type { GroupMember } from './model';
import { Avatar, Block, Hairline } from './parts';

export type GroupEvent = FunctionReturnType<typeof api.groups.events>[number];

export type GroupFeed = Readonly<{
  /** Newest first. */
  events: readonly GroupEvent[];
  busyEvent: Id<'groupEvents'> | null;
  errorMessage: string | null;
  bump: (eventId: Id<'groupEvents'>) => Promise<void>;
}>;

const ERROR_COPY: Record<string, string> = {
  NOT_IN_GROUP: 'You’re no longer in this Group.',
  EVENT_NOT_FOUND: 'That Group activity is no longer available.',
  NOT_REACTABLE: 'That Group activity can’t be reacted to.',
  OWN_EVENT: 'You can’t react to your own activity.',
};

export function useGroupFeed(): GroupFeed {
  const events = useQuery(api.groups.events, {});
  const fistBump = useMutation(api.reactions.fistBump);
  const [busyEvent, setBusyEvent] = useState<Id<'groupEvents'> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bump = async (eventId: Id<'groupEvents'>) => {
    setBusyEvent(eventId);
    setErrorMessage(null);
    try {
      await fistBump({ eventId });
    } catch (error) {
      const code = errorCode(error) ?? '';
      setErrorMessage(ERROR_COPY[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusyEvent(null);
    }
  };

  return { events: events ?? [], busyEvent, errorMessage, bump };
}

/** Only other members' finished Sets and met targets take a fist bump. */
export function isBumpable(event: GroupEvent): boolean {
  return (
    !event.isYou &&
    (event.kind === 'setCompleted' || event.kind === 'targetMet')
  );
}

/** What a row-end fist bump reacts to: that member's newest bumpable event. */
export function latestBumpable(
  events: readonly GroupEvent[],
  username: string
): GroupEvent | undefined {
  return events.find(
    (event) => isBumpable(event) && event.username === username
  );
}

function ago(now: number, at: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  return minutes < 60
    ? `${minutes} min ago`
    : `${Math.floor(minutes / 60)} h ago`;
}

/** Round fist bump action for a member row; dims when nothing to react to. */
export function BumpButton({
  event,
  feed,
  username,
}: Readonly<{
  event: GroupEvent | undefined;
  feed: GroupFeed;
  username: string;
}>) {
  const colors = useColors();
  const reacted = event?.reacted ?? false;
  const disabled =
    event === undefined || reacted || feed.busyEvent === event.eventId;
  return (
    <Pressable
      accessibilityLabel={
        reacted ? `Fist bumped ${username}` : `Fist bump ${username}`
      }
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: reacted }}
      disabled={disabled}
      onPress={() => {
        if (event) {
          void feed.bump(event.eventId);
        }
      }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: reacted
          ? colors.primaryContainer
          : colors.surfaceContainerHigh,
        opacity: pressed ? 0.6 : disabled && !reacted ? 0.35 : 1,
      })}
    >
      <Text style={{ fontSize: 18 }}>👊</Text>
    </Pressable>
  );
}

function ActivityRow({
  event,
  feed,
  member,
  now,
  avatarSize,
}: Readonly<{
  event: GroupEvent;
  feed: GroupFeed;
  member: GroupMember | undefined;
  now: number;
  avatarSize: number;
}>) {
  const colors = useColors();
  const bumpable = isBumpable(event);
  const username = event.username ?? 'member';
  const pending = feed.busyEvent === event.eventId;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {member ? (
        <Avatar member={member} size={avatarSize} />
      ) : (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.surfaceContainerHighest,
          }}
        />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.onSurface, fontSize: 15 }}>
          {groupEventText(event)}
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
          {ago(now, event.at)}
        </Text>
      </View>
      {bumpable ? (
        <Pressable
          accessibilityLabel={`Fist bump ${username}`}
          accessibilityRole="button"
          accessibilityState={{
            disabled: event.reacted || pending,
            selected: event.reacted,
          }}
          disabled={event.reacted || pending}
          onPress={() => void feed.bump(event.eventId)}
          style={({ pressed }) => ({
            height: 32,
            paddingHorizontal: 12,
            borderRadius: 16,
            justifyContent: 'center',
            backgroundColor: event.reacted
              ? colors.primaryContainer
              : colors.surfaceContainerHigh,
            opacity: pressed || pending ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: event.reacted
                ? colors.onPrimaryContainer
                : colors.onSurface,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {event.reacted ? '👊 Fist bumped' : '👊 Fist bump'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * `list`: one grouped block with hairlines. `cards`: a card per event, with
 * an empty state, for screens where the feed is the main content.
 */
export function ActivityFeed({
  feed,
  members,
  now,
  layout,
  limit,
}: Readonly<{
  feed: GroupFeed;
  members: readonly GroupMember[];
  now: number;
  layout: 'list' | 'cards';
  limit: number;
}>) {
  const colors = useColors();
  const events = feed.events.slice(0, limit);
  const error = feed.errorMessage ? (
    <Text style={{ color: colors.error, fontSize: 13 }}>
      {`Couldn’t send fist bump. ${feed.errorMessage}`}
    </Text>
  ) : null;

  if (events.length === 0) {
    return layout === 'cards' ? (
      <Block>
        <View style={{ padding: 20, gap: 4 }}>
          <Text
            style={{ color: colors.onSurface, fontSize: 16, fontWeight: '600' }}
          >
            No activity yet
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
            Finished Sets and met targets show up here, ready for a fist bump.
          </Text>
        </View>
      </Block>
    ) : null;
  }

  const row = (event: GroupEvent, avatarSize: number) => (
    <ActivityRow
      avatarSize={avatarSize}
      event={event}
      feed={feed}
      member={members.find((member) => member.username === event.username)}
      now={now}
    />
  );

  return (
    <View style={{ gap: 10 }}>
      {layout === 'list' ? (
        <Block>
          {events.map((event, index) => (
            <View key={event.eventId}>
              {index > 0 ? <Hairline /> : null}
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                {row(event, 32)}
              </View>
            </View>
          ))}
        </Block>
      ) : (
        events.map((event) => (
          <View
            key={event.eventId}
            style={{
              padding: 14,
              borderRadius: 20,
              backgroundColor: colors.surfaceContainer,
            }}
          >
            {row(event, 40)}
          </View>
        ))
      )}
      {error}
    </View>
  );
}
