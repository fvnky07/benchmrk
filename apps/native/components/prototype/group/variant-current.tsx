// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant A "Current": today's in-Group presentation, moved verbatim out of
// the route. It keeps its own legacy colours (THEME) on purpose.
import { Button, Column, Host, Row, ScrollView, Switch } from '@expo/ui';
import { useState } from 'react';
import {
  ScrollView as NativeScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { GroupActivity } from '@/components/groups/group-activity';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupHeader } from '@/components/groups/group-header';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { THEME, useAppearance } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import type { GroupActions, GroupModel } from './model';

/** Navigation bar, Group header, weights switch and spacing above the member boxes. */
const GROUP_CHROME_HEIGHT = 420;

export function VariantCurrent({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const { group, now, status } = model;
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const { width } = useWindowDimensions();
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const menu = (
    <ScrollView
      direction="horizontal"
      showsIndicators={false}
      style={{ width: width - 48 }}
    >
      <Row spacing={8}>
        <Button
          disabled={model.busy}
          label="Share code"
          variant="text"
          onPress={actions.onShare}
        />
        <Button
          disabled={model.busy}
          label={model.qrShown ? 'Hide QR' : 'Show QR'}
          variant="text"
          onPress={actions.onToggleQr}
        />
        {group.isHost ? (
          <Button
            disabled={model.busy}
            label="Revoke code"
            variant="text"
            onPress={actions.onRevokeCode}
          />
        ) : null}
        <Button
          disabled={model.busy || model.muted === null}
          label={model.muted ? 'Unmute reactions' : 'Mute reactions'}
          modifiers={[
            accessibilityModifier(
              model.muted ? 'Unmute reactions' : 'Mute reactions'
            ),
          ]}
          variant="text"
          onPress={actions.onToggleMuted}
        />
        <Button
          disabled={model.busy}
          label={group.isHost ? 'End Group' : 'Leave Group'}
          variant="text"
          onPress={actions.onLeaveOrEnd}
        />
      </Row>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NativeScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          const collapsed = nativeEvent.contentOffset.y > 120;
          setIsHeaderCollapsed((current) =>
            current === collapsed ? current : collapsed
          );
        }}
      >
        <Host
          colorScheme={resolvedAppearance}
          matchContents={{ vertical: true }}
          style={{ width }}
        >
          <Column spacing={16} style={{ padding: 24 }}>
            <InviteInbox />
            <GroupHeader
              group={group}
              now={now}
              variant="full"
              onBack={actions.onBack}
              onInvite={actions.onInvite}
              menu={menu}
            />
            <Switch
              disabled={model.busy}
              label="Show my weights, reps and volume"
              value={group.showWeights}
              onValueChange={actions.onSetShowWeights}
            />
            <GroupGrid
              members={group.members}
              now={now}
              isHost={group.isHost}
              reservedHeight={GROUP_CHROME_HEIGHT}
            />
            <GroupActivity />
            {status}
          </Column>
        </Host>
      </NativeScrollView>
      {isHeaderCollapsed ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Host
            colorScheme={resolvedAppearance}
            matchContents={{ vertical: true }}
            style={{ width }}
          >
            <Column style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
              <GroupHeader
                group={group}
                now={now}
                variant="full"
                collapsed
                menu={menu}
              />
            </Column>
          </Host>
        </View>
      ) : null}
    </View>
  );
}
