import { Button, Column, ListItem, Row, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import {
  AVAILABLE_QUICK_ACTIONS,
  QUICK_ACTIONS,
  type QuickActionId,
} from '@/lib/workout/quick-actions';

type QuickAction = { id: QuickActionId; visible: boolean };

/** Swaps a chip with its nearest available neighbour in `direction`. */
function moved(
  actions: readonly QuickAction[],
  index: number,
  direction: -1 | 1
): QuickAction[] | null {
  let target = index + direction;
  while (
    target >= 0 &&
    target < actions.length &&
    !AVAILABLE_QUICK_ACTIONS.has(actions[target].id)
  ) {
    target += direction;
  }
  if (target < 0 || target >= actions.length) return null;
  const next = [...actions];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function QuickActionsScreen() {
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!settings) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading quick actions…</Text>
      </NativeScreen>
    );
  }

  const save = async (quickActions: QuickAction[]) => {
    try {
      setErrorMessage(null);
      await updateSettings({ quickActions });
    } catch {
      setErrorMessage('Could not save quick actions. Try again.');
    }
  };

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 17 }}>
        Choose which chips appear under the Exercise title, and in what order.
        While you’re in a Group, the Group chip always comes first.
      </Text>
      {settings.quickActions.map((action, index) => {
        if (!AVAILABLE_QUICK_ACTIONS.has(action.id)) return null;
        const { label } = QUICK_ACTIONS[action.id];
        const up = moved(settings.quickActions, index, -1);
        const down = moved(settings.quickActions, index, 1);
        return (
          <Column key={action.id} spacing={4}>
            <Switch
              label={label}
              value={action.visible}
              onValueChange={(visible) =>
                void save(
                  settings.quickActions.map((item) =>
                    item.id === action.id ? { ...item, visible } : item
                  )
                )
              }
            />
            <Row spacing={8}>
              <Button
                disabled={!up}
                label={`Move ${label} up`}
                variant="text"
                onPress={() => up && void save(up)}
              />
              <Button
                disabled={!down}
                label={`Move ${label} down`}
                variant="text"
                onPress={() => down && void save(down)}
              />
            </Row>
          </Column>
        );
      })}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Not saved</ListItem>
      ) : null}
    </NativeScreen>
  );
}
