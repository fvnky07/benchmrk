import { BottomSheet, Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Card, CardRow } from '@/components/native/card';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, textColor, useColors } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';

import { errorCode } from '@/lib/workout/format';

const REASONS = [
  { label: 'Harassment', value: 'harassment' },
  { label: 'Spam', value: 'spam' },
  { label: 'Inappropriate profile', value: 'inappropriate_profile' },
  { label: 'Cheating', value: 'cheating' },
  { label: 'Other', value: 'other' },
] as const;

const ERROR_COPY: Record<string, string> = {
  NOT_IN_GROUP: 'You’re no longer in this Group.',
  NOT_HOST: 'Only the Group host can do that.',
  MEMBER_NOT_FOUND: 'They’re no longer in this Group.',
  NO_SUCH_USERNAME: 'No member with that username.',
  CANNOT_REPORT_SELF: 'You can’t report yourself.',
  CANNOT_BLOCK_SELF: 'You can’t block yourself.',
};

type Action = 'menu' | 'report' | 'block' | 'remove' | 'sent';

export function MemberActionsSheet({
  username,
  isHost,
  isPresented,
  onDismiss,
}: Readonly<{
  username: string;
  isHost: boolean;
  isPresented: boolean;
  onDismiss: () => void;
}>) {
  const colors = useColors();
  const mutedText = textColor(colors.onSurfaceVariant);
  const report = useMutation(api.safety.report);
  const block = useMutation(api.safety.block);
  const remove = useMutation(api.groups.remove);
  const [action, setAction] = useState<Action>('menu');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismiss = () => {
    setAction('menu');
    setErrorMessage(null);
    onDismiss();
  };

  const perform = async (work: () => Promise<null>, reportSuccess = false) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await work();
      if (reportSuccess) setAction('sent');
      else dismiss();
    } catch (error) {
      const code = errorCode(error) ?? '';
      setErrorMessage(ERROR_COPY[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={dismiss}
      showDragIndicator
      snapPoints={['half']}
    >
      <Column spacing={space.lg} style={{ padding: space.screen }}>
        {action === 'sent' ? (
          <Text
            textStyle={{ ...font.body, color: textColor(colors.onSurface) }}
          >
            Report sent. Thanks for telling us.
          </Text>
        ) : (
          <SectionHeader
            title={
              action === 'report'
                ? `Report ${username}`
                : action === 'block'
                  ? `Block ${username}?`
                  : action === 'remove'
                    ? 'Remove from Group?'
                    : `Actions for ${username}`
            }
          />
        )}
        {action === 'menu' ? (
          <Card divided>
            <CardRow
              chevron
              modifiers={[accessibilityModifier(`Report ${username}`)]}
              onPress={() => setAction('report')}
            >
              Report
            </CardRow>
            <CardRow
              chevron
              modifiers={[accessibilityModifier(`Block ${username}`)]}
              onPress={() => setAction('block')}
            >
              {`Block ${username}`}
            </CardRow>
            {isHost ? (
              <CardRow
                chevron
                modifiers={[
                  accessibilityModifier(`Remove ${username} from Group`),
                ]}
                onPress={() => setAction('remove')}
              >
                Remove from Group
              </CardRow>
            ) : null}
          </Card>
        ) : null}
        {action === 'report' ? (
          <>
            <Text textStyle={{ ...font.body, color: mutedText }}>
              {`Why are you reporting ${username}?`}
            </Text>
            <Card divided>
              {REASONS.map((reason) => (
                <CardRow
                  key={reason.value}
                  chevron
                  disabled={busy}
                  modifiers={[accessibilityModifier(reason.label)]}
                  onPress={() =>
                    void perform(
                      () => report({ username, reason: reason.value }),
                      true
                    )
                  }
                >
                  {reason.label}
                </CardRow>
              ))}
            </Card>
          </>
        ) : null}
        {action === 'block' ? (
          <>
            <Text textStyle={{ ...font.body, color: mutedText }}>
              You won’t see each other in Groups, and their invites won’t reach
              you.
            </Text>
            <PrimaryButton
              disabled={busy}
              label={`Block ${username}`}
              onPress={() => void perform(() => block({ username }))}
            />
          </>
        ) : null}
        {action === 'remove' ? (
          <>
            <Text textStyle={{ ...font.body, color: mutedText }}>
              {`${username} leaves this Group and can’t rejoin it. Their Workout carries on.`}
            </Text>
            <PrimaryButton
              accessibilityLabel={`Remove ${username} from Group`}
              disabled={busy}
              label="Remove from Group"
              onPress={() => void perform(() => remove({ username }))}
            />
          </>
        ) : null}
        {errorMessage ? (
          <Card>
            <CardRow supportingText={errorMessage}>Couldn’t do that</CardRow>
          </Card>
        ) : null}
        {action !== 'sent' ? (
          <Button
            label="Cancel"
            modifiers={[accessibilityModifier('Cancel')]}
            onPress={() => (action === 'menu' ? dismiss() : setAction('menu'))}
            variant="text"
          />
        ) : (
          <PrimaryButton label="Done" onPress={dismiss} />
        )}
      </Column>
    </BottomSheet>
  );
}
