import { Button, Checkbox, Column, Row, Spacer, Text } from '@expo/ui';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';

import { THEME, useAppearance } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import {
  FIELD_LABELS,
  type SetField,
  type SetType,
  setLabels,
} from '@/lib/workout/set-entry';
import { SwipeableSetRow } from './swipeable-set-row';

export type SetTableSet = {
  _id: Id<'sets'>;
  type: SetType;
  rpe: number | null;
  done: boolean;
};

type SetTableProps = {
  sets: readonly SetTableSet[];
  fields: readonly SetField[];
  /** Column headings, e.g. "kg" and "Reps". */
  headings: readonly string[];
  effortScale: EffortScale;
  focus: { setId: Id<'sets'>; field: SetField } | null;
  /** Shows the first-run swipe hint until the member dismisses it. */
  showSwipeHint: boolean;
  displayValue: (set: SetTableSet, field: SetField) => string;
  onFocus: (setId: Id<'sets'>, field: SetField) => void;
  onToggleDone: (set: SetTableSet, done: boolean) => void;
  onDuplicate: (setId: Id<'sets'>) => void;
  onDelete: (setId: Id<'sets'>) => void;
  onOpenType: (setId: Id<'sets'>) => void;
  onDismissSwipeHint: () => void;
};

const CELL_WIDTH = 76;

/**
 * The Set rows. Tap a value to type it on the keypad, tap the label for its
 * type; swipe right to complete, left to duplicate or delete. Each row is its
 * own child so a List can give it native swipe actions.
 */
export function SetTable({
  sets,
  fields,
  headings,
  effortScale,
  focus,
  showSwipeHint,
  displayValue,
  onFocus,
  onToggleDone,
  onDuplicate,
  onDelete,
  onOpenType,
  onDismissSwipeHint,
}: Readonly<SetTableProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const labels = setLabels(sets.map((set) => set.type));

  return (
    <>
      <Row spacing={8} alignment="center">
        <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Set</Text>
        <Spacer />
        {headings.map((heading) => (
          <Column
            key={heading}
            alignment="center"
            style={{ width: CELL_WIDTH }}
          >
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>
              {heading}
            </Text>
          </Column>
        ))}
        <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Done</Text>
      </Row>
      {showSwipeHint && sets.length > 0 ? (
        <Row
          spacing={8}
          alignment="center"
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.muted,
          }}
        >
          <Text textStyle={{ fontSize: 14 }}>
            Swipe right on a Set to complete it, left to duplicate or delete.
          </Text>
          <Spacer />
          <Button label="Got it" variant="text" onPress={onDismissSwipeHint} />
        </Row>
      ) : null}
      {sets.map((set, index) => (
        <SwipeableSetRow
          key={set._id}
          onComplete={set.done ? undefined : () => onToggleDone(set, true)}
          onDuplicate={() => onDuplicate(set._id)}
          onDelete={set.done ? undefined : () => onDelete(set._id)}
        >
          <Row spacing={8} alignment="center">
            <Column
              alignment="center"
              onPress={() => onOpenType(set._id)}
              style={{ width: 40, paddingVertical: 8 }}
            >
              <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                {labels[index]}
              </Text>
            </Column>
            {set.rpe === null ? null : (
              <Text textStyle={{ fontSize: 12, color: colors.mutedForeground }}>
                {`${effortScale} ${formatEffort(effortInScale(set.rpe, effortScale))}`}
              </Text>
            )}
            <Spacer />
            {fields.map((field) => {
              const value = displayValue(set, field);
              const focused = focus?.setId === set._id && focus.field === field;
              return (
                <Column
                  key={field}
                  alignment="center"
                  onPress={() => onFocus(set._id, field)}
                  style={{
                    width: CELL_WIDTH,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: focused ? 2 : 1,
                    borderColor: focused ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    textStyle={{
                      fontSize: 17,
                      color: value === '' ? colors.mutedForeground : undefined,
                    }}
                  >
                    {value === '' ? FIELD_LABELS[field] : value}
                  </Text>
                </Column>
              );
            })}
            <Checkbox
              value={set.done}
              onValueChange={(done) => onToggleDone(set, done)}
            />
          </Row>
        </SwipeableSetRow>
      ))}
    </>
  );
}
