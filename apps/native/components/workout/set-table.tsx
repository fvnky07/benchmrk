import { RNHostView } from '@expo/ui';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type ColorValue, Pressable, Text, View } from 'react-native';

import {
  type AppColors,
  font,
  radius,
  size,
  space,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import {
  FIELD_LABELS,
  type SetField,
  type SetType,
  setLabels,
} from '@/lib/workout/set-entry';
import { effortTone, SmallChip, TABULAR } from './set-keypad';

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
  /** Shows the first-run hold hint until the member dismisses it. */
  showHint: boolean;
  onFocus: (setId: Id<'sets'>, field: SetField) => void;
  /** Tapping a faded target: the Set takes its target's values. */
  onFillFromTarget: (setId: Id<'sets'>, field: SetField) => void;
  onToggleDone: (set: SetTableSet, done: boolean) => void;
  onDuplicate: (setId: Id<'sets'>) => void;
  /** Opens the note composer on this Set. */
  onNote: (setId: Id<'sets'>) => void;
  onDelete: (setId: Id<'sets'>) => void;
  /** A Set was held; its Note, Duplicate and Delete chips show under it. */
  onHold: () => void;
  onOpenType: (setId: Id<'sets'>) => void;
  /** The Target column and the sparkle explain the target. */
  onOpenTarget: () => void;
  onDismissHint: () => void;
  /** "Target", or "Last time" for timed and cardio Exercises. */
  targetHeading: string;
};

const GAP = space.sm;
const ROW_PADDING = space.sm;
const BADGE_SIZE = size.badge;
const CHECK_SIZE = 32;
const CELL_WIDTH = 68;
const ROW_RADIUS = 14;
const WHY_ACTION = { name: 'why', label: 'Why this target' };
const NOTE_ICON = { ios: 'note.text', android: 'edit_note' } as const;
const NOTE_ICON_SIZE = 16;
/** Grows the note marker's target to the 44pt/48dp minimum. */
const NOTE_SLOP = (size.touch - NOTE_ICON_SIZE) / 2;

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

/** The round Set number: primary once logged, tinted for Warm-up, Dropset and Failure Sets. */
function badgeColors(
  colors: AppColors,
  set: SetTableSet
): { fill: ColorValue; on: ColorValue } {
  if (set.done) return { fill: colors.primary, on: colors.onPrimary };
  if (set.type === 'normal') {
    return { fill: colors.surfaceContainerHigh, on: colors.onSurface };
  }
  return {
    fill: colors.secondaryContainer,
    on: colors.onSecondaryContainer,
  };
}

/**
 * The Set table, a React Native hero piece: round Set numbers, the Target
 * column, filled value cells and a check per Set; logged Sets are tinted. Tap
 * a value to type it on the keypad, a faded target to fill the Set from it,
 * the Target column or a sparkle for why, the number for the Set type, a
 * Set's note icon to open its note, and hold a Set for Note, Duplicate and
 * Delete.
 */
export function SetTable({
  sets,
  headings,
  effortScale,
  focus,
  showHint,
  onFocus,
  onFillFromTarget,
  onToggleDone,
  onDuplicate,
  onNote,
  onDelete,
  onHold,
  onOpenType,
  onOpenTarget,
  onDismissHint,
  targetHeading,
}: Readonly<SetTableProps>) {
  const colors = useColors();
  const width = useContentWidth();
  const [heldSetId, setHeldSetId] = useState<Id<'sets'> | null>(null);
  const labels = setLabels(sets.map((set) => set.type));
  // Target settings remain reachable even when targets are switched off.
  const showTargets =
    targetHeading === 'Target' || sets.some((set) => set.target !== null);
  const heading = {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  } as const;

  const hold = (setId: Id<'sets'>) => {
    if (heldSetId !== setId) onHold();
    setHeldSetId(heldSetId === setId ? null : setId);
  };
  const release = (action: () => void) => {
    setHeldSetId(null);
    action();
  };
  const tapCell = (set: SetTableSet, cell: SetTableCell) => {
    if (cell.value === '' && cell.placeholder !== '') {
      onFillFromTarget(set._id, cell.field);
    } else {
      onFocus(set._id, cell.field);
    }
  };

  return (
    <RNHostView matchContents>
      <View style={{ width, gap: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: GAP,
            paddingHorizontal: ROW_PADDING,
            paddingBottom: 4,
          }}
        >
          <Text style={[heading, { width: BADGE_SIZE, textAlign: 'center' }]}>
            Set
          </Text>
          {showTargets ? (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenTarget}
              style={{ flex: 1 }}
            >
              <Text style={heading}>{targetHeading}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {headings.map((label) => (
            <Text
              key={label}
              style={[heading, { width: CELL_WIDTH, textAlign: 'center' }]}
            >
              {label}
            </Text>
          ))}
          <View style={{ width: CHECK_SIZE }} />
        </View>
        {sets.map((set, index) => {
          const label = labels[index] ?? '';
          const badge = badgeColors(colors, set);
          const ink = set.done ? colors.onPrimaryContainer : colors.onSurface;
          const actions = [
            { name: 'note', label: set.hasNote ? 'Edit note' : 'Note' },
            { name: 'duplicate', label: 'Duplicate' },
            ...(set.done ? [] : [{ name: 'delete', label: 'Delete' }]),
          ];
          const act = (name: string) => {
            if (name === 'note') onNote(set._id);
            if (name === 'duplicate') onDuplicate(set._id);
            if (name === 'delete') onDelete(set._id);
          };
          return (
            <View key={set._id}>
              <Pressable
                accessible={false}
                onLongPress={() => hold(set._id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: GAP,
                  paddingHorizontal: ROW_PADDING,
                  paddingVertical: 6,
                  borderRadius: ROW_RADIUS,
                  backgroundColor: set.done
                    ? colors.primaryContainer
                    : undefined,
                }}
              >
                <Pressable
                  accessibilityLabel={`Set ${label}, change type`}
                  accessibilityHint="Hold for Note, Duplicate and Delete"
                  accessibilityRole="button"
                  accessibilityActions={actions}
                  onAccessibilityAction={(event) =>
                    act(event.nativeEvent.actionName)
                  }
                  onPress={() => onOpenType(set._id)}
                  onLongPress={() => hold(set._id)}
                  style={{
                    width: BADGE_SIZE,
                    height: BADGE_SIZE,
                    borderRadius: BADGE_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: badge.fill,
                  }}
                >
                  <Text
                    style={[
                      TABULAR,
                      { color: badge.on, fontSize: 15, fontWeight: '700' },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${targetHeading}, Set ${label}: ${set.target ?? 'none'}`}
                  accessibilityRole="button"
                  onPress={onOpenTarget}
                  onLongPress={() => hold(set._id)}
                  style={{ flex: 1 }}
                >
                  {showTargets ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        TABULAR,
                        { color: colors.onSurfaceVariant, fontSize: 14 },
                      ]}
                    >
                      {set.target ?? '—'}
                    </Text>
                  ) : null}
                  {set.rpe === null ? null : (
                    <Text
                      style={[
                        TABULAR,
                        {
                          color: effortTone(set.rpe, colors).fill,
                          fontSize: 11,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {`${effortScale} ${formatEffort(effortInScale(set.rpe, effortScale))}`}
                    </Text>
                  )}
                </Pressable>
                {set.hasNote ? (
                  <Pressable
                    accessibilityLabel={`Note on Set ${label}`}
                    accessibilityRole="button"
                    hitSlop={NOTE_SLOP}
                    onPress={() => onNote(set._id)}
                    onLongPress={() => hold(set._id)}
                  >
                    <SymbolView
                      name={NOTE_ICON}
                      size={NOTE_ICON_SIZE}
                      tintColor={colors.onSurfaceVariant}
                    />
                  </Pressable>
                ) : null}
                {set.cells.map((cell) => {
                  const focused =
                    focus?.setId === set._id && focus.field === cell.field;
                  const hasValue = cell.value !== '';
                  const isPlaceholder = !hasValue && cell.placeholder !== '';
                  const hasSparkle = hasValue && cell.fromTarget;
                  return (
                    <Pressable
                      key={cell.field}
                      accessibilityLabel={cellLabel(cell, label)}
                      accessibilityRole="button"
                      accessibilityActions={hasSparkle ? [WHY_ACTION] : []}
                      onAccessibilityAction={onOpenTarget}
                      onPress={() => tapCell(set, cell)}
                      onLongPress={() => hold(set._id)}
                      style={{
                        width: CELL_WIDTH,
                        height: size.cellHeight,
                        borderRadius: radius.control,
                        borderWidth: 2,
                        borderColor: focused ? colors.onSurface : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: set.done
                          ? undefined
                          : colors.surfaceContainerHigh,
                      }}
                    >
                      <Text
                        style={[
                          TABULAR,
                          {
                            color: hasValue ? ink : colors.onSurfaceVariant,
                            fontSize: 18,
                            fontWeight: hasValue ? '600' : '400',
                          },
                        ]}
                      >
                        {hasValue
                          ? cell.value
                          : isPlaceholder
                            ? cell.placeholder
                            : '–'}
                        {hasSparkle ? (
                          <Text
                            onPress={onOpenTarget}
                            style={{
                              color: colors.onSurfaceVariant,
                              fontSize: 10,
                            }}
                          >
                            {' ✦'}
                          </Text>
                        ) : null}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityLabel={`Set ${label} done`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: set.done }}
                  hitSlop={6}
                  onPress={() => onToggleDone(set, !set.done)}
                  onLongPress={() => hold(set._id)}
                  style={{
                    width: CHECK_SIZE,
                    height: CHECK_SIZE,
                    borderRadius: radius.control,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: set.done
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  }}
                >
                  <Text
                    style={{
                      color: colors.onPrimary,
                      fontSize: 18,
                      fontWeight: '800',
                    }}
                  >
                    {set.done ? '✓' : ''}
                  </Text>
                </Pressable>
              </Pressable>
              {heldSetId === set._id ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: GAP,
                    paddingHorizontal: ROW_PADDING,
                    paddingTop: 6,
                  }}
                >
                  <SmallChip
                    label={set.hasNote ? 'Edit note' : 'Note'}
                    onPress={() => release(() => onNote(set._id))}
                  />
                  <SmallChip
                    label="Duplicate"
                    onPress={() => release(() => onDuplicate(set._id))}
                  />
                  {set.done ? null : (
                    <SmallChip
                      label="Delete"
                      tone="error"
                      onPress={() => release(() => onDelete(set._id))}
                    />
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
        {showHint && sets.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: GAP,
              paddingHorizontal: ROW_PADDING,
              paddingTop: 8,
            }}
          >
            <Text
              style={{
                ...font.caption,
                flex: 1,
                color: colors.onSurfaceVariant,
              }}
            >
              Hold a Set to add a note, duplicate or delete it.
            </Text>
            <SmallChip label="Got it" onPress={onDismissHint} />
          </View>
        ) : null}
      </View>
    </RNHostView>
  );
}
