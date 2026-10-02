import { BottomSheet, Button, Column, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useState } from 'react';
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
      <Column spacing={16} style={{ padding: 24 }}>
        {action === 'sent' ? (
          <Text>Report sent. Thanks for telling us.</Text>
        ) : (
          <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
            {action === 'report'
              ? `Report ${username}`
              : action === 'block'
                ? `Block ${username}?`
                : action === 'remove'
                  ? 'Remove from Group?'
                  : `Actions for ${username}`}
          </Text>
        )}
        {action === 'menu' ? (
          <>
            <Button
              label="Report"
              modifiers={[accessibilityModifier(`Report ${username}`)]}
              onPress={() => setAction('report')}
            />
            <Button
              label={`Block ${username}`}
              modifiers={[accessibilityModifier(`Block ${username}`)]}
              onPress={() => setAction('block')}
              variant="outlined"
            />
            {isHost ? (
              <Button
                label="Remove from Group"
                modifiers={[
                  accessibilityModifier(`Remove ${username} from Group`),
                ]}
                onPress={() => setAction('remove')}
                variant="outlined"
              />
            ) : null}
          </>
        ) : null}
        {action === 'report' ? (
          <>
            <Text>{`Why are you reporting ${username}?`}</Text>
            {REASONS.map((reason) => (
              <Button
                key={reason.value}
                disabled={busy}
                label={reason.label}
                modifiers={[accessibilityModifier(reason.label)]}
                onPress={() =>
                  void perform(
                    () => report({ username, reason: reason.value }),
                    true
                  )
                }
                variant="outlined"
              />
            ))}
          </>
        ) : null}
        {action === 'block' ? (
          <>
            <ListItem>
              You won’t see each other in Groups, and their invites won’t reach
              you.
            </ListItem>
            <Button
              disabled={busy}
              label={`Block ${username}`}
              modifiers={[accessibilityModifier(`Block ${username}`)]}
              onPress={() => void perform(() => block({ username }))}
            />
          </>
        ) : null}
        {action === 'remove' ? (
          <>
            <ListItem>
              {`${username} leaves this Group and can’t rejoin it. Their Workout carries on.`}
            </ListItem>
            <Button
              disabled={busy}
              label="Remove from Group"
              modifiers={[
                accessibilityModifier(`Remove ${username} from Group`),
              ]}
              onPress={() => void perform(() => remove({ username }))}
            />
          </>
        ) : null}
        {errorMessage ? (
          <ListItem supportingText={errorMessage}>Couldn’t do that</ListItem>
        ) : null}
        {action !== 'sent' ? (
          <Button
            label="Cancel"
            modifiers={[accessibilityModifier('Cancel')]}
            onPress={() => (action === 'menu' ? dismiss() : setAction('menu'))}
            variant="text"
          />
        ) : (
          <Button
            label="Done"
            modifiers={[accessibilityModifier('Done')]}
            onPress={dismiss}
          />
        )}
      </Column>
    </BottomSheet>
  );
}
