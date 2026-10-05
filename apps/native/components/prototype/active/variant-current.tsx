// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Variant A "Current": today's Active Workout presentation, moved verbatim so
// it can be compared with the new variants.
import EditNoteIcon from '@expo/material-symbols/edit_note.xml';
import KeepIcon from '@expo/material-symbols/keep.xml';
import { Button, Column, Icon, ListItem, Row, Spacer, Text } from '@expo/ui';

import { GroupChip } from '@/components/groups/group-chip';
import { DockedScreen } from '@/components/native/docked-screen';
import { ExerciseStrip } from '@/components/workout/exercise-strip';
import { ExerciseTitlePager } from '@/components/workout/exercise-title-pager';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetKeypad } from '@/components/workout/set-keypad';
import { SetTable } from '@/components/workout/set-table';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { textColor, useColors } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import type { ActiveVariantProps } from './model';

const NOTE_ICON = { ios: 'note.text', android: EditNoteIcon } as const;
const PIN_ICON = { ios: 'pin.fill', android: KeepIcon } as const;

export function VariantCurrent({
  model,
  actions,
}: Readonly<ActiveVariantProps>) {
  const colors = useColors();
  const {
    workout,
    settings,
    group,
    exercise,
    table,
    focus,
    focusSet,
    isKeypadOpen,
    effortScale,
    alternating,
  } = model;

  const keypad =
    focus && focusSet && isKeypadOpen ? (
      <SetKeypad
        target={model.keypadTarget ?? ''}
        field={focus.field}
        effortScale={effortScale}
        rpe={focusSet.rpe}
        isFailure={focusSet.type === 'failure'}
        onKey={actions.pressKey}
        onStep={actions.step}
        onRate={actions.rate}
        onToggleScale={actions.toggleScale}
        onToggleFailure={actions.toggleFailure}
        onLog={actions.logFocused}
        onHide={actions.hideKeypad}
      />
    ) : focusSet ? (
      <Row spacing={8}>
        <Button
          label="Show keypad"
          variant="outlined"
          onPress={actions.showKeypad}
        />
        <Spacer />
        <Button label="Log Set" onPress={actions.logFocused} />
      </Row>
    ) : null;

  const plateStripRow =
    model.plateStrip === null ? null : (
      <Row
        spacing={8}
        alignment="center"
        onPress={actions.openPlates}
        style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: colors.surfaceContainerHigh,
        }}
      >
        <Text textStyle={{ fontSize: 14 }}>{model.plateStrip}</Text>
      </Row>
    );

  return (
    <DockedScreen
      dock={
        plateStripRow ? (
          <Column spacing={8}>
            {plateStripRow}
            {keypad}
          </Column>
        ) : (
          keypad
        )
      }
    >
      <Row spacing={12} alignment="center">
        <Button
          label="Workout menu"
          variant="text"
          onPress={actions.openMenu}
        />
        <Column spacing={2}>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            {workout.name}
          </Text>
          <Text textStyle={{ fontSize: 15 }}>
            {formatClock(model.elapsedSeconds)}
          </Text>
        </Column>
        <Spacer />
        <Button label="Group" variant="text" onPress={actions.openGroup} />
        <Button
          label="Exercises"
          variant="text"
          onPress={actions.openStructure}
        />
        <Button
          label="Terminate"
          variant="text"
          onPress={actions.askTerminate}
        />
      </Row>
      {workout.note ? (
        <Row spacing={6} alignment="center" onPress={actions.openWorkoutNote}>
          <Icon name={NOTE_ICON} size={14} color={colors.onSurfaceVariant} />
          <Text textStyle={{ fontSize: 14 }}>{workout.note}</Text>
        </Row>
      ) : null}
      {model.isIdle ? (
        <Column spacing={8}>
          <ListItem supportingText="Nothing has happened for 20 minutes.">
            Still working out?
          </ListItem>
          <Row spacing={8}>
            <Button label="Finish Workout" onPress={actions.finishNow} />
            <Button
              label="Keep going"
              variant="outlined"
              onPress={actions.keepGoing}
            />
          </Row>
        </Column>
      ) : null}
      <Row spacing={12} alignment="center">
        <Column style={{ width: 260 }}>
          <WorkoutProgress fraction={model.progressFraction} />
        </Column>
        <Text textStyle={{ fontSize: 14 }}>
          {`${workout.progress.done}/${workout.progress.total} Sets`}
        </Text>
        {model.aheadBehind !== null ? (
          <Text
            textStyle={{
              fontSize: 14,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            {model.aheadBehind}
          </Text>
        ) : null}
      </Row>
      {model.isConfirmingTerminate ? (
        <Column spacing={8}>
          <ListItem
            supportingText={`${workout.progress.done} of ${workout.progress.total} planned Sets are logged. Logged Sets are kept.`}
          >
            Terminate this Workout?
          </ListItem>
          <Button label="Terminate Workout" onPress={actions.terminate} />
          <Button
            label="Keep going"
            variant="outlined"
            onPress={actions.cancelTerminate}
          />
        </Column>
      ) : null}
      <ExerciseStrip
        exercises={model.strip}
        selectedIndex={model.index}
        onSelect={actions.selectExercise}
        onAdd={actions.openAddExercise}
      />
      {exercise && table ? (
        <>
          <Row spacing={8} alignment="center">
            <ExerciseTitlePager
              pages={model.titlePages}
              selectedIndex={model.index}
              onSelect={actions.selectExercise}
            />
            <RestTimer
              rest={workout.rest}
              plannedSeconds={model.plannedRestSeconds}
              now={model.now}
              onAdjust={actions.adjustRest}
              onSkip={actions.skipRest}
              onReset={actions.resetRest}
              onOpenOptions={actions.openRestOptions}
            />
          </Row>
          {alternating ? (
            <Row spacing={8} alignment="center">
              <Column spacing={2}>
                <Text textStyle={{ fontSize: 14, fontWeight: '600' }}>
                  {alternating.roundLabel}
                </Text>
                <Text textStyle={{ fontSize: 13 }}>
                  {alternating.withNames}
                </Text>
              </Column>
              <Spacer />
              {alternating.stayOnName !== null ? (
                <Button
                  label={`Stay on ${alternating.stayOnName}`}
                  variant="text"
                  onPress={actions.stayOn}
                />
              ) : alternating.canSkipForNow ? (
                <Button
                  label="Skip for now"
                  variant="text"
                  onPress={actions.skipForNow}
                />
              ) : null}
            </Row>
          ) : null}
          {exercise.standingNote ? (
            <Row
              spacing={6}
              alignment="center"
              onPress={actions.openExerciseNote}
            >
              <Icon name={PIN_ICON} size={14} color={colors.onSurfaceVariant} />
              <Text textStyle={{ fontSize: 14 }}>{exercise.standingNote}</Text>
            </Row>
          ) : null}
          {model.machineSetup !== null ? (
            <Row spacing={8} alignment="center">
              <Text textStyle={{ fontSize: 14 }}>{model.machineSetup}</Text>
              <Spacer />
              <Button
                label="Edit setup"
                variant="text"
                onPress={actions.editSetup}
              />
            </Row>
          ) : null}
          <QuickActionRow
            leading={
              group ? (
                <GroupChip
                  members={group.members}
                  onPress={actions.openGroupDrawer}
                />
              ) : null
            }
            actions={settings.quickActions}
            badges={model.quickActionBadges}
            handlers={actions.quick}
          />
          <SetTable
            sets={table.sets}
            headings={table.headings}
            effortScale={effortScale}
            focus={isKeypadOpen ? focus : null}
            showSwipeHint={!settings.swipeHintDismissed}
            onFocus={actions.focusCell}
            onFillFromTarget={actions.fillFromTarget}
            onToggleDone={actions.toggleDone}
            onNote={actions.openSetNote}
            onDuplicate={actions.duplicateSet}
            onDelete={actions.deleteSet}
            onOpenType={actions.openSetType}
            onOpenTarget={() => actions.openTarget()}
            targetHeading={table.targetHeading}
            onDismissSwipeHint={actions.dismissSwipeHint}
          />
          <Button
            label="Warm-up Set"
            variant="text"
            onPress={actions.addWarmupSet}
          />
        </>
      ) : (
        <ListItem supportingText="Add an Exercise from the strip above to start logging Sets.">
          No Exercises yet
        </ListItem>
      )}
      {model.errorMessage ? (
        <ListItem supportingText={model.errorMessage}>
          Something went wrong
        </ListItem>
      ) : null}
      {model.allDone ? (
        <Button label="Finish Workout" onPress={actions.finish} />
      ) : null}
    </DockedScreen>
  );
}
