import LinkOffIcon from '@expo/material-symbols/link_off.xml';
import LogoutIcon from '@expo/material-symbols/logout.xml';
import NotificationsIcon from '@expo/material-symbols/notifications.xml';
import NotificationsOffIcon from '@expo/material-symbols/notifications_off.xml';
import QrCodeIcon from '@expo/material-symbols/qr_code.xml';
import ShareIcon from '@expo/material-symbols/share.xml';
import {
  BottomSheet,
  Button,
  Column,
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
import { Share } from 'react-native';
import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { GroupActivity } from '@/components/groups/group-activity';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupHeader } from '@/components/groups/group-header';
import { GroupQr } from '@/components/groups/group-qr';
import { InviteByUsername } from '@/components/groups/invite-by-username';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { ScanToJoin } from '@/components/groups/scan-to-join';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { usePushPermissionReoffer } from '@/lib/push/use-push-permission-reoffer';
import {
  font,
  size,
  space,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { errorCode } from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';

/** Group links open the website, which hands over to the app. */
const JOIN_LINK_BASE = 'https://benchmrk.app/join';

/** Navigation bar, Group header, menu, weights card and spacing above the member boxes. */
const GROUP_CHROME_HEIGHT = 520;

const WEIGHTS_LABEL = 'Show my weights, reps and volume';

const SHARE_ICON = { ios: 'square.and.arrow.up', android: ShareIcon } as const;
const QR_ICON = { ios: 'qrcode', android: QrCodeIcon } as const;
const REVOKE_ICON = { ios: 'xmark.circle', android: LinkOffIcon } as const;
const MUTE_ICON = { ios: 'bell.slash', android: NotificationsOffIcon } as const;
const UNMUTE_ICON = { ios: 'bell', android: NotificationsIcon } as const;
const LEAVE_ICON = {
  ios: 'rectangle.portrait.and.arrow.right',
  android: LogoutIcon,
} as const;

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
  const colors = useColors();
  const contentWidth = useContentWidth();
  const cardContentWidth = contentWidth - space.lg * 2;
  const now = useNow();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
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
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading Group…
        </Text>
      </NativeScreen>
    );
  }

  const status = (
    <>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Couldn’t do that</CardRow>
        </Card>
      ) : null}
      {needsVerification ? (
        <Card>
          <EmailVerificationRow />
        </Card>
      ) : null}
    </>
  );

  if (group === null) {
    return (
      <NativeScreen>
        <InviteInbox />
        <Card padding={space.lg} spacing={space.md}>
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Train with friends: everyone runs their own Workout and sees each
            other’s progress.
          </Text>
          <PrimaryButton
            disabled={busy}
            label="Create a Group"
            width={cardContentWidth}
            onPress={() =>
              attempt(async () => {
                await create({});
                await reofferPush();
              })
            }
          />
        </Card>
        <Card padding={space.lg} spacing={space.md}>
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
            style={{ width: cardContentWidth, height: size.button }}
            onPress={() => attempt(() => joinByCode({ code }))}
          />
        </Card>
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

  const muted = reactions?.muted ?? false;

  const menu = (
    <ScrollView
      direction="horizontal"
      showsIndicators={false}
      style={{ width: contentWidth }}
    >
      <Row spacing={space.sm}>
        <PillChip
          disabled={busy}
          icon={SHARE_ICON}
          label="Share code"
          onPress={() => void share()}
        />
        <PillChip
          disabled={busy}
          icon={QR_ICON}
          label={qrLink ? 'Hide QR' : 'Show QR'}
          selected={qrLink !== null}
          onPress={() => void toggleQr()}
        />
        {group.isHost ? (
          <PillChip
            disabled={busy}
            icon={REVOKE_ICON}
            label="Revoke code"
            onPress={() =>
              void attempt(async () => {
                await revokeCode({});
                setQrLink(null);
              })
            }
          />
        ) : null}
        <PillChip
          disabled={busy || reactions === undefined}
          icon={muted ? UNMUTE_ICON : MUTE_ICON}
          label={muted ? 'Unmute reactions' : 'Mute reactions'}
          onPress={() => void attempt(() => setMuted({ muted: !muted }))}
        />
        <PillChip
          disabled={busy}
          icon={LEAVE_ICON}
          label={group.isHost ? 'End Group' : 'Leave Group'}
          tone="error"
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
    <NativeScreen>
      <InviteInbox />
      <GroupHeader
        group={group}
        now={now}
        variant="full"
        onBack={() =>
          router.replace(
            group.members.find((member) => member.isYou)?.progress.startedAt ==
              null
              ? '/workout'
              : '/workout/active'
          )
        }
        onInvite={() => setIsInviting(true)}
        menu={menu}
      />
      <Card>
        <CardRow
          trailing={
            <Switch
              disabled={busy}
              modifiers={[accessibilityModifier(WEIGHTS_LABEL)]}
              value={group.showWeights}
              onValueChange={(shown) =>
                void attempt(() => setShowWeights({ shown }))
              }
            />
          }
        >
          {WEIGHTS_LABEL}
        </CardRow>
      </Card>
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
          <Column spacing={space.lg} style={{ padding: space.screen }}>
            <Text
              textStyle={{
                ...font.heading,
                color: textColor(colors.onSurface),
              }}
            >
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
          <Column spacing={space.lg} style={{ padding: space.screen }}>
            <Text
              textStyle={{
                ...font.heading,
                color: textColor(colors.onSurface),
              }}
            >
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
          <Column spacing={space.lg} style={{ padding: space.screen }}>
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
    </NativeScreen>
  );
}
