import { Checkbox, Column, Row, Spacer, Text } from '@expo/ui';
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
  displayValue: (set: SetTableSet, field: SetField) => string;
  onFocus: (setId: Id<'sets'>, field: SetField) => void;
  onToggleDone: (set: SetTableSet, done: boolean) => void;
  onOpenType: (setId: Id<'sets'>) => void;
};

const CELL_WIDTH = 76;

/** The Set rows: tap a value to type it on the keypad, tap the label for its type. */
export function SetTable({
  sets,
  fields,
  headings,
  effortScale,
  focus,
  displayValue,
  onFocus,
  onToggleDone,
  onOpenType,
}: Readonly<SetTableProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const labels = setLabels(sets.map((set) => set.type));

  return (
    <Column spacing={8}>
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
      {sets.map((set, index) => (
        <Row key={set._id} spacing={8} alignment="center">
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
      ))}
    </Column>
  );
}
