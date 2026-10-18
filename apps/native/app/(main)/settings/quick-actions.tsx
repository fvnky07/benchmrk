import { Button, Column, Row, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import {
  accessibilityModifier,
  font,
  space,
  textColor,
  useColors,
} from '@/lib/ui';
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
  const colors = useColors();
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const caption = { ...font.body, color: textColor(colors.onSurfaceVariant) };

  if (!settings) {
    return (
      <NativeScreen>
        <Text textStyle={caption}>Loading quick actions…</Text>
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
      <Text textStyle={caption}>
        Choose which chips appear under the Exercise title, and in what order.
        While you’re in a Group, the Group chip always comes first.
      </Text>
      <Card divided>
        {settings.quickActions.map((action, index) => {
          if (!AVAILABLE_QUICK_ACTIONS.has(action.id)) return null;
          const { label } = QUICK_ACTIONS[action.id];
          const up = moved(settings.quickActions, index, -1);
          const down = moved(settings.quickActions, index, 1);
          return (
            <Column key={action.id}>
              <CardRow
                trailing={
                  <Switch
                    modifiers={[accessibilityModifier(label)]}
                    value={action.visible}
                    onValueChange={(visible) =>
                      void save(
                        settings.quickActions.map((item) =>
                          item.id === action.id ? { ...item, visible } : item
                        )
                      )
                    }
                  />
                }
              >
                {label}
              </CardRow>
              <Row
                spacing={space.sm}
                style={{ paddingHorizontal: space.sm, paddingBottom: space.sm }}
              >
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
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Not saved</CardRow>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
