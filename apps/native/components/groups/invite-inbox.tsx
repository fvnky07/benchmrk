import { Button, Column, ListItem, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  INVITE_EXPIRED: 'This invite has expired',
  GROUP_ENDED: 'This Group has ended',
  IN_ANOTHER_GROUP: 'You’re already in a Group. Leave it first.',
  GROUP_FULL: 'This Group is full: Groups hold up to 20 members.',
  EMAIL_NOT_VERIFIED: 'Verify your email to join Groups.',
  INVITE_NOT_FOUND: 'This invite is no longer available.',
};

type InviteError = {
  inviteId: Id<'groupInvites'>;
  code: string | null;
  message: string;
};

export function InviteInbox() {
  const invites = useQuery(api.groupInvites.inbox, {});
  const events = useQuery(api.groupInvites.eventInbox, {});
  const dismissEvent = useMutation(api.groupInvites.dismissEvent);
  const accept = useMutation(api.groupInvites.accept);
  const decline = useMutation(api.groupInvites.decline);
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState<InviteError | null>(null);
  const [eventError, setEventError] = useState<{
    entryId: Id<'groupNotifications'>;
    message: string;
  } | null>(null);

  const respond = async (
    inviteId: Id<'groupInvites'>,
    action: 'accept' | 'decline'
  ) => {
    if (busy) {
      return;
    }

    setBusy(true);
    setInviteError(null);
    try {
      if (action === 'accept') {
        await accept({ inviteId });
      } else {
        await decline({ inviteId });
      }
    } catch (error) {
      const code = errorCode(error);
      setInviteError({
        inviteId,
        code,
        message: ERROR_COPY[code ?? ''] ?? 'Something went wrong. Try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (entryId: Id<'groupNotifications'>) => {
    if (busy) return;
    setBusy(true);
    setEventError(null);
    try {
      await dismissEvent({ entryId });
    } catch {
      setEventError({
        entryId,
        message: 'Couldn’t dismiss notification. Try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!invites?.length && !events?.length) {
    return null;
  }

  return (
    <Column spacing={12}>
      <Text textStyle={{ fontSize: 22, fontWeight: '600' }}>Group inbox</Text>
      {events?.map((entry) => (
        <Column key={entry.entryId} spacing={8}>
          <ListItem>{entry.copy}</ListItem>
          <Button
            disabled={busy}
            label="Dismiss"
            modifiers={[accessibilityModifier(`Dismiss ${entry.copy}`)]}
            variant="outlined"
            onPress={() => void dismiss(entry.entryId)}
          />
          {eventError?.entryId === entry.entryId ? (
            <ListItem supportingText={eventError.message}>
              Couldn’t update notification
            </ListItem>
          ) : null}
        </Column>
      ))}
      {invites?.map((invite) => (
        <Column key={invite.inviteId} spacing={8}>
          {invite.state === 'pending' ? (
            <>
              <ListItem>
                {`${invite.inviterUsername} invited you to a Group`}
              </ListItem>
              <Row spacing={8}>
                <Button
                  disabled={busy}
                  label="Accept"
                  modifiers={[
                    accessibilityModifier(
                      `Accept invite from ${invite.inviterUsername}`
                    ),
                  ]}
                  onPress={() => void respond(invite.inviteId, 'accept')}
                />
                <Button
                  disabled={busy}
                  label="Decline"
                  modifiers={[
                    accessibilityModifier(
                      `Decline invite from ${invite.inviterUsername}`
                    ),
                  ]}
                  variant="outlined"
                  onPress={() => void respond(invite.inviteId, 'decline')}
                />
              </Row>
            </>
          ) : (
            <>
              <ListItem supportingText={`from ${invite.inviterUsername}`}>
                {invite.state === 'expired'
                  ? 'This invite has expired'
                  : 'This Group has ended'}
              </ListItem>
              <Button
                disabled={busy}
                label="Dismiss"
                modifiers={[
                  accessibilityModifier(
                    `Dismiss invite from ${invite.inviterUsername}`
                  ),
                ]}
                variant="outlined"
                onPress={() => void respond(invite.inviteId, 'decline')}
              />
            </>
          )}
          {inviteError?.inviteId === invite.inviteId ? (
            <>
              <ListItem supportingText={inviteError.message}>
                Couldn’t update invite
              </ListItem>
              {inviteError.code === 'EMAIL_NOT_VERIFIED' ? (
                <EmailVerificationRow />
              ) : null}
            </>
          ) : null}
        </Column>
      ))}
    </Column>
  );
}
