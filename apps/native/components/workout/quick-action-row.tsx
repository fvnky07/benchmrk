import { Row, ScrollView } from '@expo/ui';

import { QUICK_ACTIONS, type QuickActionId } from '@/lib/workout/quick-actions';
import { QuickActionChip } from './quick-action-chip';

type QuickActionRowProps = {
  /** The member's chips, in order; hidden or unavailable ones are skipped. */
  actions: readonly { id: QuickActionId; visible: boolean }[];
  /** Handlers for chips that apply here; chips without one aren't shown. */
  handlers: Partial<Record<QuickActionId, () => void>>;
};

/** The horizontally scrollable chip row under the Exercise title. */
export function QuickActionRow({
  actions,
  handlers,
}: Readonly<QuickActionRowProps>) {
  return (
    <ScrollView direction="horizontal" showsIndicators={false}>
      <Row spacing={8}>
        {actions.map(({ id, visible }) => {
          const onPress = handlers[id];
          if (!visible || !onPress) return null;
          const { label, icon, iconOnly } = QUICK_ACTIONS[id];
          return (
            <QuickActionChip
              key={id}
              label={label}
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
