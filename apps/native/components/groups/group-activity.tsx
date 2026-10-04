import { Button, Column, ListItem, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Platform } from 'react-native';

import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  NOT_IN_GROUP: 'You’re no longer in this Group.',
  EVENT_NOT_FOUND: 'That Group activity is no longer available.',
  NOT_REACTABLE: 'That Group activity can’t be reacted to.',
  OWN_EVENT: 'You can’t react to your own activity.',
};

export function GroupActivity() {
  const events = useQuery(api.groups.events, {});
  const fistBump = useMutation(api.reactions.fistBump);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (events === undefined || events.length === 0) return null;

  const react = async (eventId: Id<'groupEvents'>) => {
    setBusyEvent(eventId);
    setErrorMessage(null);
    try {
      await fistBump({ eventId });
    } catch (error) {
      const code = errorCode(error) ?? '';
      setErrorMessage(ERROR_COPY[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusyEvent(null);
    }
  };

  return (
    <Column spacing={12}>
      <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Activity</Text>
      {events.map((event) => {
        const name = event.isYou ? 'You' : (event.username ?? 'A Group member');
        let line: string;
        switch (event.kind) {
          case 'joined':
            line = `${name} joined`;
            break;
          case 'left':
            line = `${name} left`;
            break;
          case 'dropped':
            line = `${name} dropped out`;
            break;
          case 'removed':
            line = `${name} was removed`;
            break;
          case 'hostChanged':
            line = `${name} is now the Group host`;
            break;
          case 'ended':
            line = 'The Group ended';
            break;
          case 'setCompleted':
            line =
              event.setNumber === null
                ? `${name} finished a Set of ${event.exerciseName ?? 'Exercise'}`
                : `${name} finished Set ${event.setNumber} of ${event.exerciseName ?? 'Exercise'}`;
            break;
          case 'targetMet':
            line = `${name} met their targets on ${event.exerciseName ?? 'Exercise'}`;
            break;
        }
        const canReact =
          !event.isYou &&
          (event.kind === 'setCompleted' || event.kind === 'targetMet');
        const label = `Fist bump ${event.username ?? 'member'}`;
        return (
          <Column key={event.eventId} spacing={6}>
            <Text>{line}</Text>
            {canReact ? (
              <Button
                disabled={event.reacted || busyEvent === event.eventId}
                label={event.reacted ? 'Fist bumped' : 'Fist bump'}
                modifiers={[
                  Platform.OS === 'ios'
                    ? accessibilityLabel(label)
                    : semantics({ contentDescription: label }),
                ]}
                onPress={() => void react(event.eventId)}
                variant="text"
              />
            ) : null}
          </Column>
        );
      })}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Couldn’t send fist bump
        </ListItem>
      ) : null}
    </Column>
  );
}
