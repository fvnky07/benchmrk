import {
  BottomSheet,
  Button,
  Column,
  ListItem,
  Picker,
  Row,
  ScrollView,
  Spacer,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import { NativeTextField } from '@/components/native/native-text-field';
import { THEME, useAppearance } from '@/lib/ui';
import type { ActiveWorkout } from '@/lib/workout/rounds';
import { setLabels } from '@/lib/workout/set-entry';

/** What a note is attached to: one Set, one Exercise (every time) or the Workout. */
export type NoteTarget =
  | {
      kind: 'set';
      workoutExerciseId: Id<'workoutExercises'>;
      setId: Id<'sets'>;
    }
  | { kind: 'exercise'; workoutExerciseId: Id<'workoutExercises'> }
  | { kind: 'workout' };

type NoteScope = NoteTarget['kind'];

const SCOPE_LABELS: Record<NoteScope, string> = {
  set: 'This Set',
  exercise: 'This Exercise (every time)',
  workout: 'This Workout',
};

const SCOPE_HINTS: Record<NoteScope, string> = {
  set: 'Shown on this Set only.',
  exercise: 'Shown every time this Exercise comes up, in any Workout.',
  workout: 'Shown for this Workout only.',
};

type NotesSheetProps = {
  workout: ActiveWorkout;
  /** Where the composer opens; null when closed. */
  opened: NoteTarget | null;
  /** Called on every edit, so the Workout counts as active. */
  onActivity: () => void;
  onDismiss: () => void;
};

function exerciseOf(workout: ActiveWorkout, target: NoteTarget) {
  return target.kind === 'workout'
    ? undefined
    : workout.exercises.find((item) => item._id === target.workoutExerciseId);
}

function setLabelOf(workout: ActiveWorkout, target: NoteTarget) {
  if (target.kind !== 'set') return '';
  const sets = exerciseOf(workout, target)?.sets ?? [];
  const index = sets.findIndex((set) => set._id === target.setId);
  return setLabels(sets.map((set) => set.type))[index] ?? '';
}

/** "Note on Set 2 · Bench Press", "Note on Bench Press · every time", … */
function titleOf(workout: ActiveWorkout, target: NoteTarget): string {
  const name = exerciseOf(workout, target)?.name ?? 'Exercise';
  switch (target.kind) {
    case 'set':
      return `Note on Set ${setLabelOf(workout, target)} · ${name}`;
    case 'exercise':
      return `Note on ${name} · every time`;
    case 'workout':
      return 'Note on this Workout';
  }
}

function noteOf(workout: ActiveWorkout, target: NoteTarget): string | null {
  const exercise = exerciseOf(workout, target);
  switch (target.kind) {
    case 'set':
      return (
        exercise?.sets.find((set) => set._id === target.setId)?.note ?? null
      );
    case 'exercise':
      return exercise?.standingNote ?? null;
    case 'workout':
      return workout.note;
  }
}

/** Every note in the Workout, by target. */
function allNotes(workout: ActiveWorkout) {
  const notes: { target: NoteTarget; text: string }[] = [];
  if (workout.note)
    notes.push({ target: { kind: 'workout' }, text: workout.note });
  for (const exercise of workout.exercises) {
    if (exercise.standingNote) {
      notes.push({
        target: { kind: 'exercise', workoutExerciseId: exercise._id },
        text: exercise.standingNote,
      });
    }
    for (const set of exercise.sets) {
      if (set.note) {
        notes.push({
          target: {
            kind: 'set',
            workoutExerciseId: exercise._id,
            setId: set._id,
          },
          text: set.note,
        });
      }
    }
  }
  return notes;
}

/**
 * The one note composer. Its title always says what the note is attached to,
 * and it lists the Workout's notes by target.
 */
export function NotesSheet({
  workout,
  opened,
  onActivity,
  onDismiss,
}: Readonly<NotesSheetProps>) {
  const saveNote = useMutation(api.notes.save);
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const [target, setTarget] = useState<NoteTarget | null>(opened);
  const [text, setText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => setTarget(opened), [opened]);
  const saved = target ? noteOf(workout, target) : null;
  useEffect(() => {
    setText(saved ?? '');
    setErrorMessage(null);
  }, [saved]);

  // The scopes around the current target: its Exercise and, when known, the
  // Set of that Exercise the composer opened on.
  const workoutExerciseId =
    target && target.kind !== 'workout'
      ? target.workoutExerciseId
      : opened && opened.kind !== 'workout'
        ? opened.workoutExerciseId
        : null;
  const setScope =
    target?.kind === 'set'
      ? target
      : opened?.kind === 'set' && opened.workoutExerciseId === workoutExerciseId
        ? opened
        : null;
  const scopes: Record<NoteScope, NoteTarget | null> = {
    set: setScope,
    exercise: workoutExerciseId
      ? { kind: 'exercise', workoutExerciseId }
      : null,
    workout: { kind: 'workout' },
  };

  const save = async (next: string) => {
    onActivity();
    if (!target) return;
    try {
      setErrorMessage(null);
      const exercise = exerciseOf(workout, target);
      await saveNote({
        text: next,
        target:
          target.kind === 'set'
            ? { kind: 'set', setId: target.setId }
            : target.kind === 'exercise' && exercise
              ? { kind: 'exercise', exerciseId: exercise.exerciseId }
              : { kind: 'workout', workoutId: workout._id },
      });
    } catch {
      setErrorMessage('Could not save this note.');
    }
  };

  const listed = allNotes(workout);

  return (
    <BottomSheet
      isPresented={opened !== null}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half', 'full']}
    >
      <ScrollView>
        <Column spacing={12} style={{ padding: 16 }}>
          <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Notes</Text>
          {target ? (
            <>
              <Picker
                selectedValue={target.kind}
                onValueChange={(scope) => {
                  onActivity();
                  const next = scopes[scope as NoteScope];
                  if (next) setTarget(next);
                }}
              >
                {(Object.keys(SCOPE_LABELS) as NoteScope[])
                  .filter((scope) => scopes[scope] !== null)
                  .map((scope) => (
                    <Picker.Item
                      key={scope}
                      label={SCOPE_LABELS[scope]}
                      value={scope}
                    />
                  ))}
              </Picker>
              <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                {titleOf(workout, target)}
              </Text>
              <Text textStyle={{ fontSize: 14, color: colors.mutedForeground }}>
                {SCOPE_HINTS[target.kind]}
              </Text>
              <NativeTextField
                label="Note"
                multiline
                numberOfLines={3}
                placeholder="Write a note…"
                value={text}
                onChangeText={(next) => {
                  onActivity();
                  setText(next);
                }}
              />
              <Row spacing={8}>
                {saved ? (
                  <Button
                    label="Remove"
                    variant="outlined"
                    onPress={() => save('')}
                  />
                ) : null}
                <Spacer />
                <Button
                  label="Save note"
                  disabled={text.trim() === (saved ?? '')}
                  onPress={() => save(text)}
                />
              </Row>
              {errorMessage ? (
                <Text textStyle={{ fontSize: 15 }}>{errorMessage}</Text>
              ) : null}
            </>
          ) : null}
          <Text textStyle={{ fontSize: 15, fontWeight: '700' }}>
            All notes, by target
          </Text>
          {listed.length === 0 ? (
            <Text textStyle={{ fontSize: 14, color: colors.mutedForeground }}>
              No notes yet. Each note belongs to one Set, one Exercise or this
              Workout.
            </Text>
          ) : (
            listed.map((note) => (
              <ListItem
                key={`${note.target.kind}-${'setId' in note.target ? note.target.setId : 'workoutExerciseId' in note.target ? note.target.workoutExerciseId : 'workout'}`}
                supportingText={titleOf(workout, note.target).replace(
                  'Note on ',
                  ''
                )}
                onPress={() => {
                  onActivity();
                  setTarget(note.target);
                }}
              >
                {note.text}
              </ListItem>
            ))
          )}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
