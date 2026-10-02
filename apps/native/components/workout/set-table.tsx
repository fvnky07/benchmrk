import EditNoteIcon from '@expo/material-symbols/edit_note.xml';
import StarShineIcon from '@expo/material-symbols/star_shine.xml';
import { Button, Checkbox, Column, Icon, Row, Spacer, Text } from '@expo/ui';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import type { ComponentProps } from 'react';

import { THEME, useAppearance } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import {
  FIELD_LABELS,
  type SetField,
  type SetType,
  setLabels,
} from '@/lib/workout/set-entry';
import { GestureBox } from '@/modules/benchmrk-ui';
import { SwipeableSetRow } from './swipeable-set-row';

export type SetTableCell = {
  field: SetField;
  /** The typed or logged value as shown; '' when empty. */
  value: string;
  /** The Overload target shown faded while the field is empty; '' when none. */
  placeholder: string;
  /** The value came from the target: marked with a sparkle until edited. */
  fromTarget: boolean;
};

export type SetTableSet = {
  _id: Id<'sets'>;
  type: SetType;
  rpe: number | null;
  done: boolean;
  /** A note is attached to this Set. */
  hasNote: boolean;
  /** The Target column ("60 × 8", or the previous Set for timed and cardio); null when none. */
  target: string | null;
  cells: readonly SetTableCell[];
};

type SetTableProps = {
  sets: readonly SetTableSet[];
  /** Column headings, e.g. "kg" and "Reps". */
  headings: readonly string[];
  effortScale: EffortScale;
  focus: { setId: Id<'sets'>; field: SetField } | null;
  /** Shows the first-run swipe hint until the member dismisses it. */
  showSwipeHint: boolean;
  onFocus: (setId: Id<'sets'>, field: SetField) => void;
  /** Tapping a faded target: the Set takes its target's values. */
  onFillFromTarget: (setId: Id<'sets'>, field: SetField) => void;
  onToggleDone: (set: SetTableSet, done: boolean) => void;
  onDuplicate: (setId: Id<'sets'>) => void;
  /** Opens the note composer on this Set. */
  onNote: (setId: Id<'sets'>) => void;
  onDelete: (setId: Id<'sets'>) => void;
  onOpenType: (setId: Id<'sets'>) => void;
  /** The Target cell and the sparkle explain the target. */
  onOpenTarget: () => void;
  onDismissSwipeHint: () => void;
  /** "Target", or "Last time" for timed and cardio Exercises. */
  targetHeading: string;
};

const LABEL_WIDTH = 48;
const TARGET_WIDTH = 72;
const CELL_WIDTH = 72;
const SPARKLE = {
  ios: 'sparkles',
  android: StarShineIcon,
} as const satisfies Readonly<
  Record<'ios' | 'android', ComponentProps<typeof Icon>['name']>
>;
const NOTE = {
  ios: 'note.text',
  android: EditNoteIcon,
} as const satisfies Readonly<
  Record<'ios' | 'android', ComponentProps<typeof Icon>['name']>
>;
const WHY_ACTION = { id: 'why', label: 'Why this target' };

/** What a screen reader announces for a value cell. */
function cellLabel(cell: SetTableCell, setLabel: string): string {
  const name = `${FIELD_LABELS[cell.field]}, Set ${setLabel}`;
  if (cell.value !== '') {
    return cell.fromTarget
      ? `${name}, ${cell.value}, filled from the Overload target`
      : `${name}, ${cell.value}`;
  }
  return cell.placeholder === ''
    ? `${name}, empty`
    : `${name}, empty, target ${cell.placeholder}. Tap to fill from the target`;
}

/**
 * The Set rows. Tap a value to type it on the keypad, tap a faded target to
 * fill the Set from it, tap the Target cell or a sparkle for why; tap the
 * label for its type; swipe right to complete, left to duplicate or delete.
 * Each row is its own child so a List can give it native swipe actions.
 */
export function SetTable({
  sets,
  headings,
  effortScale,
  focus,
  showSwipeHint,
  onFocus,
  onFillFromTarget,
  onToggleDone,
  onDuplicate,
  onNote,
  onDelete,
  onOpenType,
  onOpenTarget,
  onDismissSwipeHint,
  targetHeading,
}: Readonly<SetTableProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const labels = setLabels(sets.map((set) => set.type));
  const showTargets = sets.some((set) => set.target !== null);

  return (
    <>
      <Row spacing={8} alignment="center">
        <Column style={{ width: LABEL_WIDTH }}>
          <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Set</Text>
        </Column>
        <Spacer />
        {showTargets ? (
          <Column alignment="center" style={{ width: TARGET_WIDTH }}>
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>
              {targetHeading}
            </Text>
          </Column>
        ) : null}
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
          onNote={() => onNote(set._id)}
          onDelete={set.done ? undefined : () => onDelete(set._id)}
        >
          <Row spacing={8} alignment="center">
            <Column
              alignment="center"
              onPress={() => onOpenType(set._id)}
              style={{ width: LABEL_WIDTH, paddingVertical: 8 }}
            >
              <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                {labels[index]}
              </Text>
              {set.rpe === null ? null : (
                <Text
                  textStyle={{ fontSize: 11, color: colors.mutedForeground }}
                >
                  {`${effortScale} ${formatEffort(effortInScale(set.rpe, effortScale))}`}
                </Text>
              )}
              {set.hasNote ? (
                <GestureBox
                  label={`Note on Set ${labels[index]}`}
                  onTap={() => onNote(set._id)}
                >
                  <Icon name={NOTE} size={14} color={colors.mutedForeground} />
                </GestureBox>
              ) : null}
            </Column>
            <Spacer />
            {showTargets ? (
              <GestureBox
                label={`${targetHeading}, Set ${labels[index]}: ${set.target ?? 'none'}`}
                onTap={onOpenTarget}
              >
                <Column
                  alignment="center"
                  style={{ width: TARGET_WIDTH, paddingVertical: 10 }}
                >
                  <Text textStyle={{ fontSize: 14 }}>{set.target ?? '—'}</Text>
                </Column>
              </GestureBox>
            ) : null}
            {set.cells.map((cell) => {
              const focused =
                focus?.setId === set._id && focus.field === cell.field;
              const isPlaceholder =
                cell.value === '' && cell.placeholder !== '';
              const hasSparkle = cell.fromTarget && cell.value !== '';
              return (
                <GestureBox
                  key={cell.field}
                  label={cellLabel(cell, labels[index] ?? '')}
                  actions={hasSparkle ? [WHY_ACTION] : []}
                  onAction={onOpenTarget}
                  onTap={() =>
                    isPlaceholder
                      ? onFillFromTarget(set._id, cell.field)
                      : onFocus(set._id, cell.field)
                  }
                >
                  <Column
                    alignment="center"
                    style={{
                      width: CELL_WIDTH,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: focused ? 2 : 1,
                      borderColor: focused ? colors.primary : colors.border,
                    }}
                  >
                    <Row spacing={2} alignment="center">
                      <Text
                        textStyle={{
                          fontSize: 17,
                          color:
                            cell.value === ''
                              ? colors.mutedForeground
                              : undefined,
                        }}
                      >
                        {cell.value !== ''
                          ? cell.value
                          : isPlaceholder
                            ? cell.placeholder
                            : FIELD_LABELS[cell.field]}
                      </Text>
                      {hasSparkle ? (
                        <GestureBox
                          label={WHY_ACTION.label}
                          onTap={onOpenTarget}
                        >
                          <Icon
                            name={SPARKLE}
                            size={12}
                            color={colors.mutedForeground}
                          />
                        </GestureBox>
                      ) : null}
                    </Row>
                  </Column>
                </GestureBox>
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
