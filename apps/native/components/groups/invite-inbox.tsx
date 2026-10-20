import { Button, Column, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { Card, CardRow } from '@/components/native/card';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, textColor, useColors } from '@/lib/ui';
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
  const colors = useColors();
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
    <Column spacing={space.md}>
      <SectionHeader title="Group inbox" />
      <Card divided>
        {events?.flatMap((entry) => [
          <CardRow
            key={entry.entryId}
            trailing={
              <Button
                disabled={busy}
                label="Dismiss"
                modifiers={[accessibilityModifier(`Dismiss ${entry.copy}`)]}
                variant="text"
                onPress={() => void dismiss(entry.entryId)}
              />
            }
          >
            {entry.copy}
          </CardRow>,
          ...(eventError?.entryId === entry.entryId
            ? [
                <CardRow
                  key={`${entry.entryId}-error`}
                  supportingText={eventError.message}
                >
                  Couldn’t update notification
                </CardRow>,
              ]
            : []),
        ])}
        {invites?.flatMap((invite) => [
          invite.state === 'pending' ? (
            <Column
              key={invite.inviteId}
              spacing={space.md}
              style={{ padding: space.lg }}
            >
              <Text
                textStyle={{ ...font.body, color: textColor(colors.onSurface) }}
              >
                {`${invite.inviterUsername} invited you to a Group`}
              </Text>
              <Row spacing={space.sm}>
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
            </Column>
          ) : (
            <CardRow
              key={invite.inviteId}
              supportingText={`from ${invite.inviterUsername}`}
              trailing={
                <Button
                  disabled={busy}
                  label="Dismiss"
                  modifiers={[
                    accessibilityModifier(
                      `Dismiss invite from ${invite.inviterUsername}`
                    ),
                  ]}
                  variant="text"
                  onPress={() => void respond(invite.inviteId, 'decline')}
                />
              }
            >
              {invite.state === 'expired'
                ? 'This invite has expired'
                : 'This Group has ended'}
            </CardRow>
          ),
          ...(inviteError?.inviteId === invite.inviteId
            ? [
                <CardRow
                  key={`${invite.inviteId}-error`}
                  supportingText={inviteError.message}
                >
                  Couldn’t update invite
                </CardRow>,
              ]
            : []),
        ])}
      </Card>
      {inviteError?.code === 'EMAIL_NOT_VERIFIED' ? (
        <Card>
          <EmailVerificationRow />
        </Card>
      ) : null}
    </Column>
  );
}
