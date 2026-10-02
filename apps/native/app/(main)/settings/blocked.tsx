import { Button, Column, ListItem, Row, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  NO_SUCH_USERNAME: 'No member with that username',
  CANNOT_BLOCK_SELF: 'You can’t block yourself.',
};

export default function BlockedMembersScreen() {
  const blocked = useQuery(api.safety.blocked, {});
  const block = useMutation(api.safety.block);
  const unblock = useMutation(api.safety.unblock);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const perform = async (
    action: () => Promise<null>,
    clearUsername = false
  ) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await action();
      if (clearUsername) setUsername('');
    } catch (error) {
      const code = errorCode(error) ?? '';
      setErrorMessage(ERROR_COPY[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Blocked members
      </Text>
      <Column spacing={12}>
        {blocked === undefined ? (
          <Text>Loading blocked members…</Text>
        ) : blocked.length === 0 ? (
          <Text>No one blocked</Text>
        ) : (
          blocked.map((member) => (
            <Row key={member.username} spacing={12} alignment="center">
              <Text>{member.username}</Text>
              <Button
                disabled={busy}
                label="Unblock"
                modifiers={[
                  Platform.OS === 'ios'
                    ? accessibilityLabel(`Unblock ${member.username}`)
                    : semantics({
                        contentDescription: `Unblock ${member.username}`,
                      }),
                ]}
                onPress={() =>
                  void perform(() => unblock({ username: member.username }))
                }
                variant="text"
              />
            </Row>
          ))
        )}
      </Column>
      <NativeTextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Username"
        onChangeText={setUsername}
        placeholder="Username"
        value={username}
      />
      <Button
        disabled={busy || username.trim().length === 0}
        label="Block"
        onPress={() =>
          void perform(() => block({ username: username.trim() }), true)
        }
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Couldn’t update blocked members
        </ListItem>
      ) : null}
    </NativeScreen>
  );
}
