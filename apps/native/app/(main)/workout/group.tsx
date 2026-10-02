import { Button, ListItem, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';

import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupQr } from '@/components/groups/group-qr';
import { InviteByUsername } from '@/components/groups/invite-by-username';
import { InviteInbox } from '@/components/groups/invite-inbox';
import { ScanToJoin } from '@/components/groups/scan-to-join';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
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
};

export default function GroupScreen() {
  const group = useQuery(api.groups.getMine);
  const create = useMutation(api.groups.create);
  const joinByCode = useMutation(api.groups.joinByCode);
  const shareCode = useMutation(api.groups.shareCode);
  const revokeCode = useMutation(api.groups.revokeCode);
  const leave = useMutation(api.groups.leave);
  const end = useMutation(api.groups.end);
  const now = useNow();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
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

  return (
    <NativeScreen>
      <InviteInbox />
      <InviteByUsername />
      <Row spacing={8}>
        <Button disabled={busy} label="Share code" onPress={share} />
        <Button
          disabled={busy}
          label={qrLink ? 'Hide QR' : 'Show QR'}
          variant="outlined"
          onPress={toggleQr}
        />
        {group.isHost ? (
          <Button
            disabled={busy}
            label="Revoke code"
            variant="outlined"
            onPress={() =>
              attempt(async () => {
                await revokeCode({});
                setQrLink(null);
              })
            }
          />
        ) : null}
      </Row>
      {qrLink ? <GroupQr link={qrLink} /> : null}
      <GroupGrid members={group.members} now={now} />
      {status}
      {isConfirmingEnd ? (
        <>
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
        </>
      ) : (
        <Row spacing={8}>
          <Button
            disabled={busy}
            label="Leave Group"
            variant="outlined"
            onPress={() => attempt(() => leave({}))}
          />
          {group.isHost ? (
            <Button
              disabled={busy}
              label="End Group"
              variant="text"
              onPress={() => setIsConfirmingEnd(true)}
            />
          ) : null}
        </Row>
      )}
    </NativeScreen>
  );
}
