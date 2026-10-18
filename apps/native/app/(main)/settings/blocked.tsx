import { Button, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { PrimaryButton } from '@/components/native/primary-button';
import {
  accessibilityModifier,
  font,
  space,
  textColor,
  useColors,
} from '@/lib/ui';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  NO_SUCH_USERNAME: 'No member with that username',
  CANNOT_BLOCK_SELF: 'You can’t block yourself.',
};

export default function BlockedMembersScreen() {
  const colors = useColors();
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
      {blocked === undefined || blocked.length === 0 ? (
        <Card padding={space.lg}>
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            {blocked === undefined
              ? 'Loading blocked members…'
              : 'No one blocked'}
          </Text>
        </Card>
      ) : (
        <Card divided>
          {blocked.map((member) => (
            <CardRow
              key={member.username}
              trailing={
                <Button
                  disabled={busy}
                  label="Unblock"
                  modifiers={[
                    accessibilityModifier(`Unblock ${member.username}`),
                  ]}
                  onPress={() =>
                    void perform(() => unblock({ username: member.username }))
                  }
                  variant="text"
                />
              }
            >
              {member.username}
            </CardRow>
          ))}
        </Card>
      )}
      <Card padding={space.lg} spacing={space.md}>
        <NativeTextField
          autoCapitalize="none"
          autoCorrect={false}
          label="Username"
          onChangeText={setUsername}
          placeholder="Username"
          value={username}
        />
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>
            Couldn’t update blocked members
          </CardRow>
        </Card>
      ) : null}
      <PrimaryButton
        disabled={busy || username.trim().length === 0}
        label="Block"
        onPress={() =>
          void perform(() => block({ username: username.trim() }), true)
        }
      />
    </NativeScreen>
  );
}
