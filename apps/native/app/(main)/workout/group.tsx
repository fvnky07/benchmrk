import {
  BottomSheet,
  Button,
  Column,
  Host,
  ListItem,
  Row,
  ScrollView,
  Switch,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView as NativeScrollView,
  Share,
  useWindowDimensions,
  View,
} from 'react-native';
import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { GroupActivity } from '@/components/groups/group-activity';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupHeader } from '@/components/groups/group-header';
import { GroupQr } from '@/components/groups/group-qr';
import { InviteByUsername } from '@/components/groups/invite-by-username';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { ScanToJoin } from '@/components/groups/scan-to-join';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { usePushPermissionReoffer } from '@/lib/push/use-push-permission-reoffer';
import { useAppearance, useColors } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { errorCode } from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';

/** Group links open the website, which hands over to the app. */
const JOIN_LINK_BASE = 'https://benchmrk.app/join';

/** Navigation bar, Group header, weights switch and spacing above the member boxes. */
const GROUP_CHROME_HEIGHT = 420;

const ERROR_COPY: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Verify your email to create or join Groups.',
  IN_ANOTHER_GROUP: 'You’re already in a Group. Leave it first.',
  GROUP_FULL: 'This Group is full: Groups hold up to 20 members.',
  CODE_INVALID:
    'That code isn’t valid. It may have expired or the Group ended.',
  NOT_HOST: 'Only the Group host can do that.',
  NOT_IN_GROUP: 'This Group has ended. Create or join another Group.',
};

export default function GroupScreen() {
  const group = useQuery(api.groups.getMine);
  const create = useMutation(api.groups.create);
  const joinByCode = useMutation(api.groups.joinByCode);
  const shareCode = useMutation(api.groups.shareCode);
  const revokeCode = useMutation(api.groups.revokeCode);
  const leave = useMutation(api.groups.leave);
  const end = useMutation(api.groups.end);
  const reactions = useQuery(api.reactions.mine);
  const setMuted = useMutation(api.reactions.setMuted);
  const setShowWeights = useMutation(api.groups.setShowWeights);
  const { resolvedAppearance } = useAppearance();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const now = useNow();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  // Members who skipped notifications get one more offer when Groups matter.
  const reofferPush = usePushPermissionReoffer();

  useEffect(() => {
    void reofferPush();
  }, [reofferPush]);

  const attempt = async (action: () => Promise<unknown>) => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const code = errorCode(error) ?? '';
      setNeedsVerification(code === 'EMAIL_NOT_VERIFIED');
      setErrorMessage(ERROR_COPY[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (group === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Group…</Text>
      </NativeScreen>
    );
  }

  const status = (
    <>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Couldn’t do that</ListItem>
      ) : null}
      {needsVerification ? <EmailVerificationRow /> : null}
    </>
  );

  if (group === null) {
    return (
      <NativeScreen>
        <InviteInbox />
        <Text textStyle={{ fontSize: 17 }}>
          Train with friends: everyone runs their own Workout and sees each
          other’s progress.
        </Text>
        <Button
          disabled={busy}
          label="Create a Group"
          onPress={() =>
            attempt(async () => {
              await create({});
              await reofferPush();
            })
          }
        />
        <NativeTextField
          autoCapitalize="characters"
          autoCorrect={false}
          label="Join with a code"
          maxLength={6}
          onChangeText={setCode}
          placeholder="ABC234"
          value={code}
        />
        <Button
          disabled={busy || code.trim().length < 6}
          label="Join"
          variant="outlined"
          onPress={() => attempt(() => joinByCode({ code }))}
        />
        <ScanToJoin />
        {status}
      </NativeScreen>
    );
  }

  const share = () =>
    attempt(async () => {
      const { code: current } = await shareCode({});
      await Share.share({
        message: `Join my benchmrk Group with code ${current}: ${JOIN_LINK_BASE}/${current}`,
      });
    });

  const toggleQr = () =>
    qrLink
      ? setQrLink(null)
      : attempt(async () => {
          const { code: current } = await shareCode({});
          setQrLink(`${JOIN_LINK_BASE}/${current}`);
        });

  const menu = (
    <ScrollView
      direction="horizontal"
      showsIndicators={false}
      style={{ width: width - 48 }}
    >
      <Row spacing={8}>
        <Button
          disabled={busy}
          label="Share code"
          variant="text"
          onPress={share}
        />
        <Button
          disabled={busy}
          label={qrLink ? 'Hide QR' : 'Show QR'}
          variant="text"
          onPress={toggleQr}
        />
        {group.isHost ? (
          <Button
            disabled={busy}
            label="Revoke code"
            variant="text"
            onPress={() =>
              attempt(async () => {
                await revokeCode({});
                setQrLink(null);
              })
            }
          />
        ) : null}
        <Button
          disabled={busy || reactions === undefined}
          label={reactions?.muted ? 'Unmute reactions' : 'Mute reactions'}
          modifiers={[
            accessibilityModifier(
              reactions?.muted ? 'Unmute reactions' : 'Mute reactions'
            ),
          ]}
          variant="text"
          onPress={() =>
            void attempt(() =>
              setMuted({ muted: !(reactions?.muted ?? false) })
            )
          }
        />
        <Button
          disabled={busy}
          label={group.isHost ? 'End Group' : 'Leave Group'}
          variant="text"
          onPress={() =>
            group.isHost
              ? setIsConfirmingEnd(true)
              : void attempt(() => leave({}))
          }
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
              onBack={() =>
                router.replace(
                  group.members.find((member) => member.isYou)?.progress
                    .startedAt == null
                    ? '/workout'
                    : '/workout/active'
                )
              }
              onInvite={() => setIsInviting(true)}
              menu={menu}
            />
            <Switch
              disabled={busy}
              label="Show my weights, reps and volume"
              value={group.showWeights}
              onValueChange={(shown) =>
                void attempt(() => setShowWeights({ shown }))
              }
            />
            <GroupGrid
              members={group.members}
              now={now}
              isHost={group.isHost}
              reservedHeight={GROUP_CHROME_HEIGHT}
            />
            <GroupActivity />
            {status}
            <BottomSheet
              isPresented={isInviting}
              onDismiss={() => setIsInviting(false)}
              showDragIndicator
              snapPoints={['half']}
            >
              <ScrollView>
                <Column spacing={16} style={{ padding: 24 }}>
                  <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
                    Invite to your Group
                  </Text>
                  <InviteByUsername />
                  <Button
                    disabled={busy}
                    label="Share code"
                    variant="outlined"
                    onPress={share}
                  />
                  {status}
                </Column>
              </ScrollView>
            </BottomSheet>
            <BottomSheet
              isPresented={qrLink !== null}
              onDismiss={() => setQrLink(null)}
              showDragIndicator
              snapPoints={['half', 'full']}
            >
              <ScrollView>
                <Column spacing={16} style={{ padding: 24 }}>
                  <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
                    Join this Group
                  </Text>
                  {qrLink ? <GroupQr link={qrLink} /> : null}
                  <Button
                    label="Hide QR"
                    variant="text"
                    onPress={() => setQrLink(null)}
                  />
                </Column>
              </ScrollView>
            </BottomSheet>
            <BottomSheet
              isPresented={isConfirmingEnd}
              onDismiss={() => setIsConfirmingEnd(false)}
              showDragIndicator
              snapPoints={['half']}
            >
              <ScrollView>
                <Column spacing={16} style={{ padding: 24 }}>
                  <ListItem supportingText="Everyone leaves the Group. Workouts carry on.">
                    End this Group?
                  </ListItem>
                  <Button
                    disabled={busy}
                    label="End Group"
                    onPress={() => attempt(() => end({}))}
                  />
                  <Button
                    label="Cancel"
                    variant="text"
                    onPress={() => setIsConfirmingEnd(false)}
                  />
                  {status}
                </Column>
              </ScrollView>
            </BottomSheet>
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
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.outlineVariant,
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
