// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant B "Table" (MacroFactor-faithful): compact top bar, Exercise strip,
// big bold title with "Set n of m", pill action chips, the set table, a docked
// keypad with effort dots and a solid primary Finish when everything is logged.
import { Pressable, Text, View } from 'react-native';

import { GroupChip } from '@/components/groups/group-chip';
import { ExerciseStrip } from '@/components/workout/exercise-strip';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { useColors } from '@/lib/ui';
import { ModelKeypad } from './keypad';
import type { ActiveVariantProps } from './model';
import {
  Chip,
  Glyph,
  INSET,
  NativeIsland,
  PrimaryButton,
  useContentWidth,
} from './parts';
import { Dock, ProtoScreen, StatusBanners, TopBar, useRest } from './screen';
import { SetRows } from './set-rows';

/** Alternating sets: the round and partners, with Stay on / Skip for now. */
function AlternatingBanner({ model, actions }: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const { alternating } = model;
  if (!alternating) return null;
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

/** A one-line note or setup row: icon, text, optional trailing action. */
function InfoRow({
  glyph,
  text,
  onPress,
  actionLabel,
}: Readonly<{
  glyph: 'note' | 'pin';
  text: string;
  onPress: () => void;
  actionLabel?: string;
}>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Glyph name={glyph} size={16} color={colors.onSurfaceVariant} />
      <Text
        numberOfLines={2}
        style={{ flex: 1, color: colors.onSurfaceVariant, fontSize: 14 }}
      >
        {text}
      </Text>
      {actionLabel ? (
        <Chip size="small" label={actionLabel} onPress={onPress} />
      ) : null}
    </Pressable>
  );
}

export function VariantTable({ model, actions }: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const rest = useRest(model);
  const dockWidth = useContentWidth() + 2 * INSET - 24;
  const { exercise, table, focusSet, group } = model;
  const status = model.titlePages[model.index]?.status ?? '';

  const dock =
    model.focus && focusSet && model.isKeypadOpen ? (
      <Dock>
        <ModelKeypad model={model} actions={actions} />
      </Dock>
    ) : model.allDone ? (
      <Dock>
        <PrimaryButton
          label="Finish Workout"
          onPress={actions.finish}
          width={dockWidth}
        />
      </Dock>
    ) : focusSet ? (
      <Dock>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Chip label="Keypad" onPress={actions.showKeypad} />
          <PrimaryButton
            label="Log set"
            onPress={actions.logFocused}
            width={dockWidth - 108}
          />
        </View>
      </Dock>
    ) : undefined;

  return (
    <ProtoScreen
      header={<TopBar model={model} actions={actions} rest={rest} />}
      dock={dock}
    >
      <StatusBanners model={model} actions={actions} />
      {model.workout.note ? (
        <InfoRow
          glyph="note"
          text={model.workout.note}
          onPress={actions.openWorkoutNote}
        />
      ) : null}
      <NativeIsland>
        <ExerciseStrip
          exercises={model.strip}
          selectedIndex={model.index}
          onSelect={actions.selectExercise}
          onAdd={actions.openAddExercise}
        />
      </NativeIsland>
      {exercise && table ? (
        <>
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.onSurface,
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {exercise.name}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
              {status}
            </Text>
          </View>
          <AlternatingBanner model={model} actions={actions} />
          {exercise.standingNote ? (
            <InfoRow
              glyph="pin"
              text={exercise.standingNote}
              onPress={actions.openExerciseNote}
            />
          ) : null}
          {model.machineSetup !== null ? (
            <InfoRow
              glyph="note"
              text={model.machineSetup}
              onPress={actions.editSetup}
              actionLabel="Edit setup"
            />
          ) : null}
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
          <SetRows
            table={table}
            focus={model.isKeypadOpen ? model.focus : null}
            effortScale={model.effortScale}
            exerciseIndex={model.index}
            exerciseId={exercise._id}
            isSelected
            actions={actions}
            showHint={!model.settings.swipeHintDismissed}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Warm-up Set" onPress={actions.addWarmupSet} />
          </View>
        </>
      ) : (
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
      )}
    </ProtoScreen>
  );
}
