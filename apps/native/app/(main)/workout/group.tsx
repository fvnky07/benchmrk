// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The in-Group presentation switches on `?variant=`; queries, mutations,
// state, handlers and sheets stay here, rendered once outside the switch.
import {
  BottomSheet,
  Button,
  Column,
  ListItem,
  ScrollView,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { type ComponentType, useEffect, useState } from 'react';
import { Share } from 'react-native';
import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { GroupQr } from '@/components/groups/group-qr';
import { InviteByUsername } from '@/components/groups/invite-by-username';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { ScanToJoin } from '@/components/groups/scan-to-join';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import type {
  GroupActions,
  GroupModel,
  GroupVariantProps,
} from '@/components/prototype/group/model';
import { VariantCurrent } from '@/components/prototype/group/variant-current';
import { VariantLeaderboard } from '@/components/prototype/group/variant-leaderboard';
import { VariantSpotlight } from '@/components/prototype/group/variant-spotlight';
import { VariantTiles } from '@/components/prototype/group/variant-tiles';
import {
  PrototypeVariants,
  useVariant,
} from '@/components/prototype/variant-switcher';
import { usePushPermissionReoffer } from '@/lib/push/use-push-permission-reoffer';
import { errorCode } from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';

/** Group links open the website, which hands over to the app. */
const JOIN_LINK_BASE = 'https://benchmrk.app/join';

const ERROR_COPY: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Verify your email to create or join Groups.',
  IN_ANOTHER_GROUP: 'You’re already in a Group. Leave it first.',
  GROUP_FULL: 'This Group is full: Groups hold up to 20 members.',
  CODE_INVALID:
    'That code isn’t valid. It may have expired or the Group ended.',
  NOT_HOST: 'Only the Group host can do that.',
  NOT_IN_GROUP: 'This Group has ended. Create or join another Group.',
};

const GROUP_VARIANTS = [
  { key: 'A', name: 'Current' },
  { key: 'B', name: 'Leaderboard' },
  { key: 'C', name: 'Tiles' },
  { key: 'D', name: 'Spotlight' },
] as const;

const PRESENTATIONS: Record<string, ComponentType<GroupVariantProps>> = {
  A: VariantCurrent,
  B: VariantLeaderboard,
  C: VariantTiles,
  D: VariantSpotlight,
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
  const settings = useQuery(api.memberSettings.get);
  const setMuted = useMutation(api.reactions.setMuted);
  const setShowWeights = useMutation(api.groups.setShowWeights);
  const now = useNow();
  const variant = useVariant(GROUP_VARIANTS);
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

  const self = group.members.find((member) => member.isYou);

  const model: GroupModel = {
    group,
    members: group.members,
    now,
    isHost: group.isHost,
    muted: reactions === undefined ? null : reactions.muted,
    showWeights: group.showWeights,
    units: settings?.units ?? 'kg',
    busy,
    qrShown: qrLink !== null,
    selfProgress: self?.progress ?? null,
    status,
  };

  const actions: GroupActions = {
    onBack: () =>
      router.replace(
        self?.progress.startedAt == null ? '/workout' : '/workout/active'
      ),
    onInvite: () => setIsInviting(true),
    onShare: share,
    onToggleQr: toggleQr,
    onRevokeCode: () =>
      attempt(async () => {
        await revokeCode({});
        setQrLink(null);
      }),
    onToggleMuted: () =>
      void attempt(() => setMuted({ muted: !(reactions?.muted ?? false) })),
    onLeaveOrEnd: () =>
      group.isHost ? setIsConfirmingEnd(true) : void attempt(() => leave({})),
    onSetShowWeights: (shown) => void attempt(() => setShowWeights({ shown })),
  };

  const Presentation = PRESENTATIONS[variant] ?? VariantCurrent;

  return (
    <PrototypeVariants variants={GROUP_VARIANTS}>
      <Presentation actions={actions} model={model} />
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
    </PrototypeVariants>
  );
}
