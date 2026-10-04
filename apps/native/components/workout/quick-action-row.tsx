import { Row, ScrollView } from '@expo/ui';
import type { ReactNode } from 'react';

import { QUICK_ACTIONS, type QuickActionId } from '@/lib/workout/quick-actions';
import { QuickActionChip } from './quick-action-chip';

type QuickActionRowProps = {
  /** A fixed chip before the member's configurable chips. */
  leading?: ReactNode;
  /** The member's chips, in order; hidden or unavailable ones are skipped. */
  actions: readonly { id: QuickActionId; visible: boolean }[];
  /** Handlers for chips that apply here; chips without one aren't shown. */
  handlers: Partial<Record<QuickActionId, () => void>>;
  /** Counts shown on chips, like the notes on the Note chip. */
  badges?: Partial<Record<QuickActionId, number>>;
};

/** The horizontally scrollable chip row under the Exercise title. */
export function QuickActionRow({
  leading,
  actions,
  handlers,
  badges = {},
}: Readonly<QuickActionRowProps>) {
  return (
    <ScrollView direction="horizontal" showsIndicators={false}>
      <Row spacing={8}>
        {leading}
        {actions.map(({ id, visible }) => {
          const onPress = handlers[id];
          if (!visible || !onPress) return null;
          const { label, icon, iconOnly } = QUICK_ACTIONS[id];
          const count = badges[id] ?? 0;
          return (
            <QuickActionChip
              key={id}
              label={count > 0 ? `${label} · ${count}` : label}
              icon={icon}
              iconOnly={iconOnly}
              onPress={onPress}
            />
          );
        })}
      </Row>
    </ScrollView>
  );
}
