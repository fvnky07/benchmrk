// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The MacroFactor set table: round set badges, a target/previous column,
// filled value cells with a focused outline, a trailing checkbox, logged rows
// tinted primaryContainer. Hold a row for Note, Duplicate and Delete.
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { SetTableCell, SetTableSet } from '@/components/workout/set-table';
import { useColors } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import type { ActiveActions, ExerciseTable, Focus } from './model';
import { Chip, effortTone, TABULAR } from './parts';

const BADGE = 36;
const CHECK = 32;
const GAP = 8;

export function SetRows({
  table,
  focus,
  effortScale,
  exerciseIndex,
  exerciseId,
  isSelected,
  actions,
  compact = false,
  showHint = false,
}: Readonly<{
  table: ExerciseTable;
  /** The cell to outline; null for none. */
  focus: Focus | null;
  effortScale: EffortScale;
  exerciseIndex: number;
  exerciseId: Id<'workoutExercises'>;
  /** The keypad types into this Exercise's Sets. */
  isSelected: boolean;
  actions: ActiveActions;
  compact?: boolean;
  /** Shows the first-run "hold a Set" hint. */
  showHint?: boolean;
}>) {
  const colors = useColors();
  const [heldSetId, setHeldSetId] = useState<Id<'sets'> | null>(null);
  const cellWidth = compact ? 64 : 68;
  const showTargets =
    table.targetHeading === 'Target' ||
    table.sets.some((set) => set.target !== null);
  const heading = {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  } as const;

  const tapCell = (set: SetTableSet, cell: SetTableCell) => {
    const filling = cell.value === '' && cell.placeholder !== '';
    if (filling && isSelected) {
      actions.fillFromTarget(set._id, cell.field);
      return;
    }
    actions.focusCellOf(exerciseIndex, set._id, cell.field);
    if (filling) actions.fillFromTarget(set._id, cell.field);
  };

  return (
    <View style={{ gap: compact ? 2 : 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: GAP,
          paddingHorizontal: 8,
          paddingBottom: 4,
        }}
      >
        <Text style={[heading, { width: BADGE, textAlign: 'center' }]}>
          Set
        </Text>
        {showTargets ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => actions.openTarget(exerciseId)}
            style={{ flex: 1 }}
          >
            <Text style={heading}>{table.targetHeading}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {table.headings.map((label) => (
          <Text
            key={label}
            style={[heading, { width: cellWidth, textAlign: 'center' }]}
          >
            {label}
          </Text>
        ))}
        <View style={{ width: CHECK }} />
      </View>
      {table.sets.map((set, setIndex) => {
        const label = table.labels[setIndex] ?? '';
        const isHeld = heldSetId === set._id;
        const inkOnRow = set.done
          ? colors.onPrimaryContainer
          : colors.onSurface;
        return (
          <View key={set._id}>
            <Pressable
              accessibilityHint="Hold for Note, Duplicate and Delete"
              onLongPress={() => setHeldSetId(isHeld ? null : set._id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: GAP,
                paddingHorizontal: 8,
                paddingVertical: compact ? 4 : 6,
                borderRadius: 14,
                backgroundColor: set.done ? colors.primaryContainer : undefined,
              }}
            >
              <Pressable
                accessibilityLabel={`Set ${label}, change type`}
                accessibilityRole="button"
                onPress={() => actions.openSetType(set._id)}
                style={{
                  width: BADGE,
                  height: BADGE,
                  borderRadius: BADGE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: set.done
                    ? colors.primary
                    : set.type === 'normal'
                      ? colors.surfaceContainerHigh
                      : colors.secondaryContainer,
                }}
              >
                <Text
                  style={{
                    color: set.done
                      ? colors.onPrimary
                      : set.type === 'normal'
                        ? colors.onSurface
                        : colors.onSecondaryContainer,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`${table.targetHeading}, Set ${label}: ${set.target ?? 'none'}`}
                onPress={() => actions.openTarget(exerciseId)}
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
              {set.cells.map((cell) => {
                const focused =
                  focus?.setId === set._id && focus.field === cell.field;
                const hasValue = cell.value !== '';
                const isPlaceholder = !hasValue && cell.placeholder !== '';
                const shown = hasValue
                  ? cell.value
                  : isPlaceholder
                    ? cell.placeholder
                    : '–';
                return (
                  <Pressable
                    key={cell.field}
                    accessibilityLabel={`Set ${label}, ${hasValue ? cell.value : 'empty'}`}
                    accessibilityRole="button"
                    onPress={() => tapCell(set, cell)}
                    style={{
                      width: cellWidth,
                      height: compact ? 40 : 44,
                      borderRadius: compact ? 8 : 10,
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
                          color: hasValue ? inkOnRow : colors.onSurfaceVariant,
                          fontSize: compact ? 16 : 18,
                          fontWeight: hasValue ? '600' : '400',
                        },
                      ]}
                    >
                      {shown}
                      {hasValue && cell.fromTarget ? (
                        <Text
                          onPress={() => actions.openTarget(exerciseId)}
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
                onPress={() => actions.toggleDone(set, !set.done)}
                style={{
                  width: CHECK,
                  height: CHECK,
                  borderRadius: 10,
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
            {isHeld ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: GAP,
                  paddingHorizontal: 8,
                  paddingTop: 6,
                }}
              >
                <Chip
                  size="small"
                  label={set.hasNote ? 'Edit note' : 'Note'}
                  onPress={() => {
                    setHeldSetId(null);
                    actions.openSetNote(set._id);
                  }}
                />
                <Chip
                  size="small"
                  label="Duplicate"
                  onPress={() => {
                    setHeldSetId(null);
                    actions.duplicateSet(set._id);
                  }}
                />
                {set.done ? null : (
                  <Chip
                    size="small"
                    tone="error"
                    label="Delete"
                    onPress={() => {
                      setHeldSetId(null);
                      actions.deleteSet(set._id);
                    }}
                  />
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      {showHint && table.sets.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: GAP,
            paddingHorizontal: 8,
            paddingTop: 8,
          }}
        >
          <Text
            style={{ flex: 1, color: colors.onSurfaceVariant, fontSize: 13 }}
          >
            Hold a Set to add a note, duplicate or delete it.
          </Text>
          <Chip
            size="small"
            label="Got it"
            onPress={actions.dismissSwipeHint}
          />
        </View>
      ) : null}
    </View>
  );
}
