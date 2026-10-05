// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant C "Tiles": a two-column grid of square member tiles, each led by a
// progress ring; your own tile is emphasised. Group settings are a plain
// list below the grid; "Back to my Workout" is docked at the bottom.
import { presenceOf } from '@repo/backend/convex/domain/presence';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { useColors } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { ActivityFeed, useGroupFeed } from './activity';
import {
  type GroupActions,
  type GroupMember,
  type GroupModel,
  groupMenu,
  paceOf,
  statusText,
  volumeLine,
} from './model';
import {
  ActionList,
  Avatar,
  BackButton,
  InviteButton,
  NativeColumn,
  PrimaryButton,
  Ring,
  SCREEN_PADDING,
  ScreenTitle,
  SectionTitle,
  TABULAR,
  useMemberActions,
} from './parts';

const GAP = 12;

function Tile({
  member,
  size,
  model,
  onBack,
}: Readonly<{
  member: GroupMember;
  size: number;
  model: GroupModel;
  onBack: () => void;
}>) {
  const colors = useColors();
  const { open, sheet } = useMemberActions(member, model.isHost);
  const { progress } = member;
  const { now, units } = model;
  const own = member.isYou;
  const reconnecting = presenceOf(member.lastSeenAt, now) === 'reconnecting';
  const ink = own ? colors.onPrimaryContainer : colors.onSurface;
  const inkVariant = own ? colors.onPrimaryContainer : colors.onSurfaceVariant;
  const sets =
    progress.setsPlanned === 0
      ? '–'
      : `${progress.setsDone}/${progress.setsPlanned}`;
  const headline = progress.currentExercise ?? statusText(progress, now);
  const caption = reconnecting
    ? 'Reconnecting…'
    : progress.currentExercise
      ? statusText(progress, now)
      : (volumeLine(progress, units) ?? '');
  const press = own ? onBack : open;

  return (
    <>
      <Pressable
        accessibilityHint={
          own ? 'Back to your Workout' : `Actions for ${member.username}`
        }
        accessibilityLabel={`${member.username}${own ? ', you' : ''}, ${sets} Sets, ${headline}${caption ? `, ${caption}` : ''}`}
        accessibilityRole="button"
        disabled={!press}
        onPress={press}
        style={({ pressed }) => ({
          width: size,
          height: size,
          padding: 14,
          borderRadius: 24,
          justifyContent: 'space-between',
          overflow: 'hidden',
          backgroundColor: own
            ? colors.primaryContainer
            : colors.surfaceContainer,
          opacity: reconnecting ? 0.45 : pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar member={member} size={28} />
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: ink, fontSize: 15, fontWeight: '700' }}
          >
            {member.username}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Ring
            fraction={paceOf(progress)}
            size={Math.round(size * 0.44)}
            strokeWidth={8}
            trackColor={own ? colors.surface : colors.surfaceContainerHighest}
          >
            <Text
              style={{
                color: ink,
                fontSize: 18,
                fontWeight: '800',
                fontVariant: TABULAR,
              }}
            >
              {sets}
            </Text>
          </Ring>
        </View>
        <View style={{ gap: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: ink, fontSize: 14, fontWeight: '600' }}
          >
            {headline}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: inkVariant,
              fontSize: 12,
              fontVariant: TABULAR,
            }}
          >
            {caption}
          </Text>
        </View>
      </Pressable>
      {sheet}
    </>
  );
}

export function VariantTiles({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const feed = useGroupFeed();
  const { group, now, members } = model;
  const contentWidth = width - SCREEN_PADDING * 2;
  const tileSize = Math.floor((contentWidth - GAP) / 2);
  const count = members.length;
  const together = `${formatClock((now - group.createdAt) / 1000)} together`;
  const notStarted = model.selfProgress?.startedAt == null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingBottom: 32,
        }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
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

        <View
          style={{
            marginTop: 20,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: GAP,
          }}
        >
          {members.map((member) => (
            <Tile
              key={member.username}
              member={member}
              model={model}
              size={tileSize}
              onBack={actions.onBack}
            />
          ))}
        </View>

        {feed.events.length > 0 ? (
          <View style={{ marginTop: 24, gap: 10 }}>
            <SectionTitle>Latest</SectionTitle>
            <ActivityFeed
              feed={feed}
              layout="list"
              limit={1}
              members={members}
              now={now}
            />
          </View>
        ) : null}

        <View style={{ marginTop: 24, gap: 10 }}>
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

      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.outlineVariant,
        }}
      >
        <PrimaryButton
          label={notStarted ? 'Back to Workouts' : 'Back to my Workout'}
          onPress={actions.onBack}
        />
      </View>
    </View>
  );
}
