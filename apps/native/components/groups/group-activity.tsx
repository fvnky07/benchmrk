import { Button, Column, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { groupEventText } from '@/lib/groups/event-text';
import { accessibilityModifier } from '@/lib/ui/accessibility';
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
        const line = groupEventText(event);
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
                modifiers={[accessibilityModifier(label)]}
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
