// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant D "Overview": the whole Workout on one scrolling page. A sticky
// summary header, then one card per Exercise; the selected card carries extras.
import { useRef } from 'react';
import { Pressable, type ScrollView, Text, View } from 'react-native';

import { GroupChip } from '@/components/groups/group-chip';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { useColors } from '@/lib/ui';
import { formatClock, weightInUnit } from '@/lib/workout/format';
import { ModelKeypad } from './keypad';
import type {
  ActiveActions,
  ActiveModel,
  ActiveVariantProps,
  WorkoutExercise,
} from './model';
import {
  Chip,
  Glyph,
  IconButton,
  INSET,
  NativeIsland,
  PrimaryButton,
  TABULAR,
  useContentWidth,
} from './parts';
import {
  Dock,
  ProtoScreen,
  type RestView,
  StatusBanners,
  useRest,
} from './screen';
import { SetRows } from './set-rows';

const CARD_PADDING = 16;
const CARD_BORDER = 2;

function Stat({ value, label }: Readonly<{ value: string; label: string }>) {
  const colors = useColors();
  return (
    <View>
      <Text
        numberOfLines={1}
        style={[
          TABULAR,
          { color: colors.onSurface, fontSize: 17, fontWeight: '700' },
        ]}
      >
        {value}
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
        {label}
      </Text>
    </View>
  );
}

/** Elapsed clock, Workout name, Sets and Volume totals, progress; sticky. */
function SummaryHeader({ model, actions }: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const { done, total } = model.workout.progress;
  const volumeKg = model.workout.exercises.reduce(
    (sum, exercise) =>
      exercise.sets.reduce(
        (inner, set) =>
          set.completedAt === null
            ? inner
            : inner + (set.weightKg ?? 0) * (set.reps ?? 0),
        sum
      ),
    0
  );
  const volume = Math.round(weightInUnit(volumeKg, model.units));
  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: INSET,
        paddingTop: 8,
        paddingBottom: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[
              TABULAR,
              { color: colors.onSurface, fontSize: 28, fontWeight: '800' },
            ]}
          >
            {formatClock(model.elapsedSeconds)}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: colors.onSurfaceVariant, fontSize: 13 }}
          >
            {model.workout.name}
          </Text>
        </View>
        <Stat label="Sets" value={`${done}/${total}`} />
        <Stat
          label="Volume"
          value={`${volume.toLocaleString()} ${model.units}`}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton
            glyph="exercises"
            label="Exercises"
            onPress={actions.openStructure}
          />
          <IconButton
            glyph="more"
            label="Workout menu"
            onPress={actions.openMenu}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: colors.surfaceContainerHighest,
          }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.round(model.progressFraction * 100)}%`,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        {model.aheadBehind !== null ? (
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
            {model.aheadBehind}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** What only the selected Exercise shows below its Sets. */
function SelectedExtras({
  model,
  actions,
  exercise,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  exercise: WorkoutExercise;
}>) {
  const colors = useColors();
  const { alternating, group, machineSetup } = model;
  const rowWidth = useContentWidth() - 2 * (CARD_PADDING + CARD_BORDER);
  return (
    <>
      {alternating ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.secondaryContainer,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.onSecondaryContainer,
                fontSize: 14,
                fontWeight: '600',
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
              tone="inverse"
              label={`Stay on ${alternating.stayOnName}`}
              onPress={actions.stayOn}
            />
          ) : alternating.canSkipForNow ? (
            <Chip
              size="small"
              tone="inverse"
              label="Skip for now"
              onPress={actions.skipForNow}
            />
          ) : null}
        </View>
      ) : null}
      {exercise.standingNote ? (
        <Pressable
          accessibilityRole="button"
          onPress={actions.openExerciseNote}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Glyph name="pin" size={16} color={colors.onSurfaceVariant} />
          <Text
            numberOfLines={3}
            style={{ flex: 1, color: colors.onSurfaceVariant, fontSize: 14 }}
          >
            {exercise.standingNote}
          </Text>
        </Pressable>
      ) : null}
      {machineSetup !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ flex: 1, color: colors.onSurfaceVariant, fontSize: 14 }}
          >
            {machineSetup}
          </Text>
          <Chip size="small" label="Edit setup" onPress={actions.editSetup} />
        </View>
      ) : null}
      <NativeIsland width={rowWidth}>
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
      <View style={{ alignSelf: 'flex-start' }}>
        <Chip label="Warm-up Set" onPress={actions.addWarmupSet} />
      </View>
    </>
  );
}

/** One Exercise: tappable header, its Sets, and extras when selected. */
function ExerciseCard({
  model,
  actions,
  exercise,
  index,
  onMeasured,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  exercise: WorkoutExercise;
  index: number;
  /** The card's top within the scroll content, after every layout pass. */
  onMeasured: (y: number) => void;
}>) {
  const colors = useColors();
  const isSelected = index === model.index;
  const loggedSets = exercise.sets.filter(
    (set) => set.completedAt !== null
  ).length;
  return (
    <View
      onLayout={(event) => onMeasured(event.nativeEvent.layout.y)}
      style={{
        gap: 8,
        padding: CARD_PADDING,
        borderRadius: 20,
        borderWidth: CARD_BORDER,
        borderColor: isSelected ? colors.primary : 'transparent',
        backgroundColor: colors.surfaceContainer,
        opacity: exercise.skipped ? 0.5 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => actions.selectExercise(index)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{ color: colors.onSurface, fontSize: 20, fontWeight: '700' }}
          >
            {exercise.name}
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
            {`${loggedSets} of ${exercise.sets.length} Sets`}
          </Text>
        </View>
        {isSelected ? (
          <Chip
            size="small"
            tone="primary"
            label="Current"
            onPress={() => actions.selectExercise(index)}
          />
        ) : null}
      </Pressable>
      <SetRows
        compact
        actions={actions}
        effortScale={model.effortScale}
        exerciseId={exercise._id}
        exerciseIndex={index}
        focus={isSelected && model.isKeypadOpen ? model.focus : null}
        isSelected={isSelected}
        showHint={isSelected && !model.settings.swipeHintDismissed}
        table={model.tableFor(exercise)}
      />
      {isSelected ? (
        <SelectedExtras actions={actions} exercise={exercise} model={model} />
      ) : null}
    </View>
  );
}

function RestAction({
  label,
  accessibilityLabel,
  onPress,
}: Readonly<{
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.inverseOnSurface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={[
          TABULAR,
          { color: colors.inverseOnSurface, fontSize: 13, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The floating rest pill: clock opens options; −15, +15 and Skip adjust it. */
function RestFloat({
  rest,
  actions,
}: Readonly<{ rest: RestView; actions: ActiveActions }>) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: colors.inverseSurface,
      }}
    >
      <Pressable
        accessibilityLabel={
          rest.isOver ? 'Rest over' : `Rest, ${rest.clock} left`
        }
        accessibilityRole="button"
        onLongPress={actions.resetRest}
        onPress={actions.openRestOptions}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Glyph name="timer" size={20} color={colors.inverseOnSurface} />
        <Text
          style={[
            TABULAR,
            { color: colors.inverseOnSurface, fontSize: 17, fontWeight: '700' },
          ]}
        >
          {rest.isOver ? 'Rest over' : rest.clock}
        </Text>
      </Pressable>
      <RestAction
        accessibilityLabel="Subtract 15 seconds"
        label="−15"
        onPress={() => actions.adjustRest(-15)}
      />
      <RestAction
        accessibilityLabel="Add 15 seconds"
        label="+15"
        onPress={() => actions.adjustRest(15)}
      />
      <RestAction
        accessibilityLabel="Skip rest"
        label="Skip"
        onPress={actions.skipRest}
      />
    </View>
  );
}

export function VariantOverview({
  model,
  actions,
}: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const rest = useRest(model);
  const contentWidth = useContentWidth();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledTo = useRef<number | null>(null);
  const { exercises } = model.workout;
  const keypadShown =
    model.focus !== null && model.focusSet !== undefined && model.isKeypadOpen;

  // Moving the selection collapses the extras of the card above, so a card's y
  // is only right once the layout pass that follows: scroll from its onLayout.
  const scrollToSelected = (index: number, y: number) => {
    if (index !== model.index || scrolledTo.current === index) return;
    scrolledTo.current = index;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  const dock = keypadShown ? (
    <Dock>
      <ModelKeypad actions={actions} confirmLabel="Log set" model={model} />
    </Dock>
  ) : model.allDone ? (
    <Dock>
      <PrimaryButton
        label="Finish Workout"
        onPress={actions.finish}
        width={contentWidth + 2 * INSET - 24}
      />
    </Dock>
  ) : undefined;

  return (
    <ProtoScreen
      dock={dock}
      floating={
        rest.isResting || rest.isOver ? (
          <RestFloat actions={actions} rest={rest} />
        ) : undefined
      }
      header={<SummaryHeader actions={actions} model={model} />}
      scrollRef={scrollRef}
    >
      <StatusBanners actions={actions} model={model} />
      {exercises.length === 0 ? (
        <View
          style={{
            gap: 8,
            padding: CARD_PADDING,
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
          <View style={{ alignSelf: 'flex-start' }}>
            <Chip label="Add Exercise" onPress={actions.openAddExercise} />
          </View>
        </View>
      ) : (
        exercises.map((exercise, i) => (
          <ExerciseCard
            actions={actions}
            exercise={exercise}
            index={i}
            key={exercise._id}
            model={model}
            onMeasured={(y) => scrollToSelected(i, y)}
          />
        ))
      )}
      {exercises.length > 0 ? (
        <View style={{ alignItems: 'center' }}>
          <Chip label="Add Exercise" onPress={actions.openAddExercise} />
        </View>
      ) : null}
      {model.allDone && keypadShown ? (
        <PrimaryButton label="Finish Workout" onPress={actions.finish} />
      ) : null}
    </ProtoScreen>
  );
}
