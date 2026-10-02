import { Button, Column, ListItem, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { ErrorBoundaryProps } from 'expo-router';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { errorCode, formatWeight } from '@/lib/workout/format';
import { formatMinutes } from '@/lib/workout/time';

const ERROR_COPY: Record<string, string> = {
  NOT_FOUND: 'This recap isn’t available.',
};

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const code = errorCode(error) ?? '';
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
        {ERROR_COPY[code] ?? 'Something went wrong. Try again.'}
      </Text>
      <Button label="Back" onPress={() => router.back()} />
    </NativeScreen>
  );
}

export default function GroupRecapScreen() {
  const { groupId: rawGroupId } = useLocalSearchParams<{ groupId: string }>();
  const groupId = rawGroupId as Id<'groups'>;
  const recap = useQuery(api.recaps.get, { groupId });
  const settings = useQuery(api.memberSettings.get);
  const hide = useMutation(api.recaps.hide);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (recap === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Group recap…</Text>
      </NativeScreen>
    );
  }

  const units = settings?.units ?? 'kg';
  const ownUsername = recap.rows.find((row) => row.isYou)?.username;
  const timelineText = recap.timeline.map((event) => {
    const name =
      event.username === ownUsername
        ? 'You'
        : (event.username ?? 'A Group member');
    switch (event.kind) {
      case 'joined':
        return `${name} joined`;
      case 'left':
        return `${name} left`;
      case 'dropped':
        return `${name} dropped out`;
      case 'removed':
        return `${name} was removed`;
      case 'hostChanged':
        return `${name} is now the Group host`;
      case 'ended':
        return 'The Group ended';
      case 'setCompleted':
        return event.setNumber === null
          ? `${name} finished a Set of ${event.exerciseName ?? 'Exercise'}`
          : `${name} finished Set ${event.setNumber} of ${event.exerciseName ?? 'Exercise'}`;
      case 'targetMet':
        return `${name} met their targets on ${event.exerciseName ?? 'Exercise'}`;
      default:
        return null;
    }
  });

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>Group recap</Text>
      <Text>{new Date(recap.endedAt).toLocaleString()}</Text>
      <Column spacing={12}>
        {recap.rows.map((row) => (
          <Column key={row.username} spacing={4}>
            <Text textStyle={{ fontSize: 18, fontWeight: '700' }}>
              {row.isYou ? `${row.username} · You` : row.username}
            </Text>
            <ListItem>{`${row.setsDone} Sets`}</ListItem>
            <ListItem>{`Duration ${formatMinutes(row.durationSeconds)}`}</ListItem>
            <ListItem>{`Targets met ${row.targetsMet}`}</ListItem>
            {row.volumeKg !== null ? (
              <ListItem>{`Volume ${formatWeight(row.volumeKg, units)}`}</ListItem>
            ) : null}
          </Column>
        ))}
      </Column>
      <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Timeline</Text>
      <Column spacing={8}>
        {timelineText.map((line, index) =>
          line === null ? null : (
            // biome-ignore lint/suspicious/noArrayIndexKey: Timeline events are immutable and ordered
            <Text key={`${index}:${line}`}>{line}</Text>
          )
        )}
      </Column>
      <Button
        disabled={busy}
        label="Hide from my history"
        modifiers={[
          Platform.OS === 'ios'
            ? accessibilityLabel('Hide from my history')
            : semantics({ contentDescription: 'Hide from my history' }),
        ]}
        onPress={async () => {
          setBusy(true);
          setErrorMessage(null);
          try {
            await hide({ groupId });
            router.back();
          } catch (error) {
            const code = errorCode(error) ?? '';
            setErrorMessage(
              ERROR_COPY[code] ?? 'Something went wrong. Try again.'
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Couldn’t hide recap</ListItem>
      ) : null}
    </NativeScreen>
  );
}
