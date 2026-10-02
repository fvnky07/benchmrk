import { Button, Column, ListItem } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Platform } from 'react-native';

import { NativeTextField } from '@/components/native/native-text-field';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  NO_SUCH_USERNAME: 'No member with that username',
  ALREADY_IN_GROUP: 'They’re already in your Group.',
  INVITE_LIMIT: 'You’ve sent 10 invites in the last hour. Try again later.',
  INVITE_COOLDOWN:
    'They declined recently. You can invite them again in an hour.',
  NOT_IN_GROUP: 'Join or create a Group to invite people.',
};

export function InviteByUsername() {
  const send = useMutation(api.groupInvites.send);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invite = async () => {
    const exactUsername = username.trim();
    if (busy || exactUsername === '') {
      return;
    }

    setBusy(true);
    setSent(false);
    setErrorMessage(null);
    try {
      await send({ username: exactUsername });
      setUsername('');
      setSent(true);
    } catch (error) {
      setErrorMessage(
        ERROR_COPY[errorCode(error) ?? ''] ?? 'Something went wrong. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Column spacing={8}>
      <NativeTextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Invite by username"
        onChangeText={(value) => {
          setUsername(value);
          setSent(false);
          setErrorMessage(null);
        }}
        value={username}
      />
      <Button
        disabled={busy || username.trim() === ''}
        label="Invite"
        modifiers={[
          Platform.OS === 'ios'
            ? accessibilityLabel('Invite by username')
            : semantics({ contentDescription: 'Invite by username' }),
        ]}
        onPress={() => void invite()}
      />
      {sent ? <ListItem>Invite sent</ListItem> : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Couldn’t send invite</ListItem>
      ) : null}
    </Column>
  );
}
