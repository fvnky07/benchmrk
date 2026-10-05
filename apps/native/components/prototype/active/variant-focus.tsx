// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant C "Focus": one Set at a time. A hero card holds the rest ring, the
// focused Set as giant weight × reps with one huge Log button, or the finished
// state; the Sets are a compact list underneath and the keypad opens on demand.
import { Row } from '@expo/ui';
import { Fragment, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GroupChip } from '@/components/groups/group-chip';
import { ExerciseTitlePager } from '@/components/workout/exercise-title-pager';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import type { SetTableSet } from '@/components/workout/set-table';
import { useColors } from '@/lib/ui';
import { ModelKeypad } from './keypad';
import type {
  ActiveActions,
  ActiveModel,
  ActiveVariantProps,
  Alternating,
  ExerciseTable,
  WorkoutSet,
} from './model';
import {
  Chip,
  EffortDots,
  NativeIsland,
  PrimaryButton,
  ProgressRing,
  TABULAR,
  useContentWidth,
} from './parts';
import {
  Dock,
  ProtoScreen,
  type RestView,
  StatusBanners,
  TopBar,
  useRest,
} from './screen';

const HERO_PADDING = 20;
/** The big number's line box and the cell chrome around it. */
const NUMBER_LINE = 84;
const CELL_BORDER = 3;
const CELL_PADDING = 4;

/** The focused Set: its live state, its table row and where it sits. */
type CurrentSet = Readonly<{
  set: WorkoutSet;
  row: SetTableSet;
  label: string;
  /** "Set 2 of 4" */
  position: string;
}>;

function SetBadge({
  set,
  label,
  size,
}: Readonly<{ set: SetTableSet; label: string; size: number }>) {
  const colors = useColors();
  const special = set.type !== 'normal';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: set.done
          ? colors.primary
          : special
            ? colors.secondaryContainer
            : colors.surfaceContainerHigh,
      }}
    >
      <Text
        style={{
          color: set.done
            ? colors.onPrimary
            : special
              ? colors.onSecondaryContainer
              : colors.onSurface,
          fontSize: size > 30 ? 15 : 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Alternating sets: the round and partners, with Stay on / Skip for now. */
function AlternatingBanner({
  alternating,
  actions,
}: Readonly<{ alternating: Alternating; actions: ActiveActions }>) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: colors.secondaryContainer,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: colors.onSecondaryContainer,
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          {alternating.roundLabel}
        </Text>
        <Text style={{ color: colors.onSecondaryContainer, fontSize: 13 }}>
          {alternating.withNames}
        </Text>
      </View>
      {alternating.stayOnName !== null ? (
        <Chip
          size="small"
          label={`Stay on ${alternating.stayOnName}`}
          onPress={actions.stayOn}
        />
      ) : alternating.canSkipForNow ? (
        <Chip size="small" label="Skip for now" onPress={actions.skipForNow} />
      ) : null}
    </View>
  );
}

function EmptyState({ actions }: Readonly<{ actions: ActiveActions }>) {
  const colors = useColors();
  return (
    <View
      style={{
        gap: 12,
        padding: 20,
        borderRadius: 20,
        backgroundColor: colors.surfaceContainer,
      }}
    >
      <Text
        style={{ color: colors.onSurface, fontSize: 20, fontWeight: '700' }}
      >
        No Exercises yet
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
        Add an Exercise to start logging Sets.
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Chip
          tone="primary"
          label="Add Exercise"
          onPress={actions.openAddExercise}
        />
      </View>
    </View>
  );
}

/** Hero state a: the rest ring, what is up next, and the rest controls. */
function RestHero({
  rest,
  next,
  actions,
  onShowSet,
}: Readonly<{
  rest: RestView;
  next: CurrentSet | null;
  actions: ActiveActions;
  onShowSet: () => void;
}>) {
  const colors = useColors();
  return (
    <>
      <ProgressRing
        size={232}
        thickness={14}
        color={rest.tone}
        track={colors.surfaceContainerHighest}
        fraction={rest.fraction}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            TABULAR,
            {
              maxWidth: 180,
              color: colors.onSurface,
              fontSize: 64,
              fontWeight: '800',
            },
          ]}
        >
          {rest.clock}
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
          Rest
        </Text>
      </ProgressRing>
      {next ? (
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            style={{ color: colors.onSurface, fontSize: 17, fontWeight: '700' }}
          >
            {`Up next · ${next.position}`}
          </Text>
          {next.row.target === null ? null : (
            <Text
              style={[
                TABULAR,
                { color: colors.onSurfaceVariant, fontSize: 15 },
              ]}
            >
              {next.row.target}
            </Text>
          )}
        </View>
      ) : null}
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Chip label="−15 s" onPress={() => actions.adjustRest(-15)} />
          <Chip tone="primary" label="Skip rest" onPress={actions.skipRest} />
          <Chip label="+15 s" onPress={() => actions.adjustRest(15)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip
            size="small"
            label="Options"
            onPress={actions.openRestOptions}
          />
          {next ? (
            <Chip size="small" label="Show Set" onPress={onShowSet} />
          ) : null}
        </View>
      </View>
    </>
  );
}

/** Hero state b: the focused Set as giant numbers and one huge Log button. */
function SetHero({
  model,
  actions,
  table,
  current,
  onShowRest,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  table: ExerciseTable;
  current: CurrentSet;
  /** While resting: brings the rest ring back into the hero. */
  onShowRest?: () => void;
}>) {
  const colors = useColors();
  const buttonWidth = useContentWidth() - 2 * HERO_PADDING;
  const { set, row, label, position } = current;
  const outlined = model.isKeypadOpen ? model.focus : null;
  const fillable = row.cells.find(
    (cell) => cell.value === '' && cell.placeholder !== ''
  );

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: 10,
        }}
      >
        <SetBadge set={row} label={label} size={36} />
        <Text
          style={{
            flex: 1,
            color: colors.onSurfaceVariant,
            fontSize: 15,
            fontWeight: '600',
          }}
        >
          {position}
        </Text>
        {onShowRest ? (
          <Chip size="small" label="Show rest" onPress={onShowRest} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
        {row.cells.map((cell, cellIndex) => {
          const hasValue = cell.value !== '';
          const isFocused =
            outlined?.setId === row._id && outlined.field === cell.field;
          return (
            <Fragment key={cell.field}>
              {cellIndex > 0 ? (
                <View
                  style={{
                    height: NUMBER_LINE,
                    marginTop: CELL_BORDER + CELL_PADDING,
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontSize: 32,
                      fontWeight: '600',
                    }}
                  >
                    ×
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${table.headings[cellIndex] ?? cell.field}, ${hasValue ? cell.value : 'empty'}`}
                onPress={() =>
                  actions.focusCellOf(model.index, row._id, cell.field)
                }
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: CELL_PADDING,
                  borderRadius: 20,
                  borderWidth: CELL_BORDER,
                  borderColor: isFocused ? colors.onSurface : 'transparent',
                }}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                  style={[
                    TABULAR,
                    {
                      alignSelf: 'stretch',
                      textAlign: 'center',
                      color: hasValue
                        ? colors.onSurface
                        : colors.onSurfaceVariant,
                      fontSize: 72,
                      lineHeight: NUMBER_LINE,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {hasValue
                    ? cell.value
                    : cell.placeholder !== ''
                      ? cell.placeholder
                      : '–'}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                  {table.headings[cellIndex] ?? ''}
                </Text>
              </Pressable>
            </Fragment>
          );
        })}
      </View>
      {row.target !== null || fillable ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {row.target === null ? null : (
            <Text
              style={[
                TABULAR,
                { color: colors.onSurfaceVariant, fontSize: 15 },
              ]}
            >
              {`${table.targetHeading === 'Target' ? 'Overload target' : table.targetHeading} · ${row.target}`}
            </Text>
          )}
          {fillable ? (
            <Chip
              size="small"
              label="Use target"
              onPress={() => actions.fillFromTarget(row._id, fillable.field)}
            />
          ) : null}
        </View>
      ) : null}
      <View style={{ alignSelf: 'stretch' }}>
        <EffortDots
          rpe={set.rpe}
          scale={model.effortScale}
          onRate={actions.rate}
        />
      </View>
      <PrimaryButton
        label={set.completedAt !== null ? 'Update set' : 'Log set'}
        onPress={actions.logFocused}
        labelHeight={56}
        width={buttonWidth}
      />
    </>
  );
}

/** Hero state c: every Set of the Exercise is logged. */
function FinishedHero({
  model,
  actions,
  table,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  table: ExerciseTable;
}>) {
  const colors = useColors();
  const buttonWidth = useContentWidth() - 2 * HERO_PADDING;
  const count = table.sets.length;
  const nextIndex = model.workout.exercises.findIndex(
    (exercise) =>
      !exercise.skipped && exercise.sets.some((set) => set.completedAt === null)
  );
  const addSet = actions.quick.addSet;
  return (
    <>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <Text
          style={{ color: colors.onPrimary, fontSize: 40, fontWeight: '800' }}
        >
          ✓
        </Text>
      </View>
      <Text
        style={{ color: colors.onSurface, fontSize: 22, fontWeight: '800' }}
      >
        {count === 1 ? '1 Set logged' : `All ${count} Sets logged`}
      </Text>
      {model.allDone ? (
        <PrimaryButton
          label="Finish Workout"
          onPress={actions.finish}
          labelHeight={56}
          width={buttonWidth}
        />
      ) : nextIndex >= 0 ? (
        <PrimaryButton
          label="Next Exercise"
          onPress={() => actions.selectExercise(nextIndex)}
          labelHeight={56}
          width={buttonWidth}
        />
      ) : null}
      {addSet ? <Chip label="Add Set" onPress={addSet} /> : null}
    </>
  );
}

/** The Exercise's Sets, compact: tap one to bring it into the hero. */
function SetList({
  model,
  actions,
  table,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  table: ExerciseTable;
}>) {
  const colors = useColors();
  const [firstField] = table.fields;
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{ color: colors.onSurface, fontSize: 17, fontWeight: '700' }}
      >
        Sets
      </Text>
      {table.sets.map((set, setIndex) => {
        const label = table.labels[setIndex] ?? '';
        const isFocused = model.focusSet?._id === set._id;
        const hasValues = set.cells.some((cell) => cell.value !== '');
        const summary = hasValues
          ? set.cells
              .map((cell) => (cell.value === '' ? '–' : cell.value))
              .join(' × ')
          : (set.target ?? '—');
        return (
          <Pressable
            key={set._id}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label}`}
            onPress={
              firstField === undefined
                ? undefined
                : () => actions.focusCellOf(model.index, set._id, firstField)
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: isFocused ? colors.primary : 'transparent',
              backgroundColor: set.done
                ? colors.primaryContainer
                : colors.surfaceContainer,
            }}
          >
            <SetBadge set={set} label={label} size={28} />
            <Text
              numberOfLines={1}
              style={[
                TABULAR,
                {
                  flex: 1,
                  fontSize: 17,
                  fontWeight: hasValues ? '600' : '400',
                  color: !hasValues
                    ? colors.onSurfaceVariant
                    : set.done
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                },
              ]}
            >
              {summary}
            </Text>
            <Pressable
              accessibilityLabel={`Set ${label} done`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: set.done }}
              hitSlop={8}
              onPress={() => actions.toggleDone(set, !set.done)}
              style={{
                width: 32,
                height: 32,
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
        );
      })}
    </View>
  );
}

export function VariantFocus({ model, actions }: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const rest = useRest(model);
  // While resting, the member can peek at the Set instead of the ring.
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!rest.isResting) setPeek(false);
  }, [rest.isResting]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: hide the keypad once when this variant opens
  useEffect(() => {
    if (model.isKeypadOpen) actions.hideKeypad();
  }, []);

  const { exercise, table, focusSet, group } = model;
  const focusIndex =
    table && focusSet
      ? table.sets.findIndex((set) => set._id === focusSet._id)
      : -1;
  const focusRow =
    table && focusIndex >= 0 ? table.sets[focusIndex] : undefined;
  const current: CurrentSet | null =
    table && focusSet && focusRow
      ? {
          set: focusSet,
          row: focusRow,
          label: table.labels[focusIndex] ?? '',
          position: `Set ${focusIndex + 1} of ${table.sets.length}`,
        }
      : null;
  const isResting = rest.isResting && !peek;

  return (
    <ProtoScreen
      header={<TopBar model={model} actions={actions} rest={rest} />}
      dock={
        model.focus && focusSet && model.isKeypadOpen ? (
          <Dock>
            <ModelKeypad
              model={model}
              actions={actions}
              confirmLabel="Log set"
            />
          </Dock>
        ) : undefined
      }
    >
      <StatusBanners model={model} actions={actions} />
      {exercise && table ? (
        <>
          <NativeIsland>
            <Row spacing={8} alignment="center">
              <ExerciseTitlePager
                pages={model.titlePages}
                selectedIndex={model.index}
                onSelect={actions.selectExercise}
              />
            </Row>
          </NativeIsland>
          {model.alternating ? (
            <AlternatingBanner
              alternating={model.alternating}
              actions={actions}
            />
          ) : null}
          <View
            style={{
              alignItems: 'center',
              gap: 16,
              padding: HERO_PADDING,
              borderRadius: 28,
              backgroundColor: colors.surfaceContainer,
            }}
          >
            {isResting ? (
              <RestHero
                rest={rest}
                next={current}
                actions={actions}
                onShowSet={() => setPeek(true)}
              />
            ) : current ? (
              <SetHero
                model={model}
                actions={actions}
                table={table}
                current={current}
                onShowRest={rest.isResting ? () => setPeek(false) : undefined}
              />
            ) : (
              <FinishedHero model={model} actions={actions} table={table} />
            )}
          </View>
          {model.allDone && (isResting || current) ? (
            <PrimaryButton label="Finish Workout" onPress={actions.finish} />
          ) : null}
          <SetList model={model} actions={actions} table={table} />
          <NativeIsland>
            <QuickActionRow
              leading={
                group ? (
                  <GroupChip
                    members={group.members}
                    onPress={actions.openGroupDrawer}
                  />
                ) : null
              }
              actions={model.settings.quickActions}
              badges={model.quickActionBadges}
              handlers={actions.quick}
            />
          </NativeIsland>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Warm-up Set" onPress={actions.addWarmupSet} />
            <Chip label="Add Exercise" onPress={actions.openAddExercise} />
          </View>
        </>
      ) : (
        <EmptyState actions={actions} />
      )}
    </ProtoScreen>
  );
}
