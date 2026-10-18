import LogoutIcon from '@expo/material-symbols/logout.xml';
import { BottomSheet, Column, ScrollView } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupHeader } from '@/components/groups/group-header';
import { Card, CardRow } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { space } from '@/lib/ui';
import { errorCode } from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';

type GroupDrawerProps = {
  isPresented: boolean;
  onDismiss: () => void;
};

const ERROR_COPY: Record<string, string> = {
  NOT_IN_GROUP: 'You’re no longer in this Group.',
  NOT_HOST: 'Only the Group host can end the Group.',
};

const LEAVE_ICON = {
  ios: 'rectangle.portrait.and.arrow.right',
  android: LogoutIcon,
} as const;

/** Sheet grabber, Group header and spacing above the member boxes. */
const DRAWER_CHROME_HEIGHT = 240;

/** A large native sheet keeps Group progress within the Workout. */
export function GroupDrawer({
  isPresented,
  onDismiss,
}: Readonly<GroupDrawerProps>) {
  const group = useQuery(api.groups.getMine, isPresented ? {} : 'skip');
  const leave = useMutation(api.groups.leave);
  const end = useMutation(api.groups.end);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isPresented && group === null) onDismiss();
  }, [group, isPresented, onDismiss]);

  const dismiss = () => {
    setErrorMessage(null);
    onDismiss();
  };

  const attempt = async (action: () => Promise<unknown>) => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await action();
      dismiss();
    } catch (error) {
      setErrorMessage(
        ERROR_COPY[errorCode(error) ?? ''] ?? 'Couldn’t do that. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmEnd = () => {
    Alert.alert(
      'End this Group?',
      'Everyone leaves the Group. Workouts carry on.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Group',
          style: 'destructive',
          onPress: () => void attempt(() => end({})),
        },
      ]
    );
  };

  const actionLabel = group?.isHost ? 'End Group' : 'Leave Group';

  return (
    <BottomSheet
      isPresented={isPresented && Boolean(group)}
      onDismiss={dismiss}
      showDragIndicator
      // The universal sheet cannot select an initial detent; full alone opens large.
      snapPoints={['full']}
    >
      {group ? (
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingTop: space.sm }}
        >
          <GroupHeader
            group={group}
            now={now}
            variant="compact"
            onClose={dismiss}
            onExpand={() => {
              router.push('/workout/group');
              dismiss();
            }}
            menu={
              <PillChip
                disabled={busy}
                icon={LEAVE_ICON}
                label={actionLabel}
                tone="error"
                onPress={() =>
                  group.isHost ? confirmEnd() : void attempt(() => leave({}))
                }
              />
            }
          />
          {errorMessage ? (
            <Card>
              <CardRow supportingText={errorMessage}>Couldn’t do that</CardRow>
            </Card>
          ) : null}
          <ScrollView>
            <Column style={{ paddingBottom: space.xl }}>
              <GroupGrid
                members={group.members}
                now={now}
                isHost={group.isHost}
                reservedHeight={DRAWER_CHROME_HEIGHT}
              />
            </Column>
          </ScrollView>
        </Column>
      ) : null}
    </BottomSheet>
  );
}
