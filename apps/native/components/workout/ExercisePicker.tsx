import { BottomSheet, Button, ListItem, Picker, Text } from '@expo/ui';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { NativeTextField } from '@/components/native/native-text-field';
import { sessionExercisesApi } from '@/lib/convex/session-api';
import { type ExerciseSummary, exercisesApi } from '@/lib/convex/workout-api';

interface ExercisePickerProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onExerciseAdded: (sessionExerciseId: string) => void;
}

const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Cardio',
];

export function ExercisePicker({
  sessionId,
  isOpen,
  onClose,
  onExerciseAdded,
}: Readonly<ExercisePickerProps>) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exercises = useQuery(exercisesApi.listExercises);
  const addExercise = useMutation(sessionExercisesApi.addExerciseToSession);
  const filtered = (exercises ?? []).filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      exercise.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleSelect = async (exercise: ExerciseSummary) => {
    try {
      setErrorMessage(null);
      const sessionExerciseId = await addExercise({
        sessionId,
        exerciseId: exercise._id,
      });
      onExerciseAdded(sessionExerciseId);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not add exercise.'
      );
    }
  };

  return (
    <BottomSheet
      isPresented={isOpen}
      onDismiss={onClose}
      snapPoints={['half', 'full']}
    >
      <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>Add exercise</Text>
      <NativeTextField
        autoCorrect={false}
        label="Search"
        onChangeText={setSearch}
        placeholder="Search exercises"
        value={search}
      />
      <Picker
        selectedValue={selectedCategory}
        onValueChange={(value) => {
          if (typeof value === 'string') {
            setSelectedCategory(value);
          }
        }}
      >
        {CATEGORIES.map((category) => (
          <Picker.Item key={category} label={category} value={category} />
        ))}
      </Picker>
      {exercises === undefined ? (
        <ListItem supportingText="Loading exercise catalog…">
          Exercises
        </ListItem>
      ) : filtered.length === 0 ? (
        <ListItem supportingText="Try a different search or category.">
          No exercises found
        </ListItem>
      ) : (
        filtered.map((exercise) => (
          <ListItem
            key={exercise._id}
            supportingText={exercise.category ?? exercise.description}
            onPress={() => handleSelect(exercise)}
          >
            {exercise.name}
          </ListItem>
        ))
      )}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Could not add exercise
        </ListItem>
      ) : null}
      <Button label="Close" variant="outlined" onPress={onClose} />
    </BottomSheet>
  );
}
