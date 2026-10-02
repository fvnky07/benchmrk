import {
  BottomSheet,
  Button,
  Column,
  ListItem,
  Picker,
  ScrollView,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { NativeTextField } from '@/components/native/native-text-field';
import {
  EQUIPMENT_LABEL,
  type Equipment,
  EXERCISE_TYPE_LABEL,
  type ExerciseType,
} from '@/lib/workout/exercise-labels';

type ExercisePickerProps = {
  isPresented: boolean;
  onDismiss: () => void;
  onPick: (exerciseId: Id<'exercises'>) => void;
};

const TYPES = Object.keys(EXERCISE_TYPE_LABEL) as ExerciseType[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABEL) as Equipment[];

/** Searches the catalog plus the member's custom Exercises, or creates one. */
export function ExercisePicker({
  isPresented,
  onDismiss,
  onPick,
}: Readonly<ExercisePickerProps>) {
  const exercises = useQuery(api.exercises.list, isPresented ? {} : 'skip');
  const createCustom = useMutation(api.exercises.createCustom);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExerciseType | 'all'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'all'>(
    'all'
  );
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ExerciseType>('strength');
  const [newEquipment, setNewEquipment] = useState<Equipment>('barbell');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const matches = (exercises ?? []).filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(query) &&
      (typeFilter === 'all' || exercise.type === typeFilter) &&
      (equipmentFilter === 'all' || exercise.equipment === equipmentFilter)
  );

  const create = async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);
      const { exerciseId } = await createCustom({
        name: newName,
        type: newType,
        equipment: newEquipment,
      });
      setNewName('');
      onPick(exerciseId);
    } catch {
      setErrorMessage('Could not create this Exercise. Try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      snapPoints={['full']}
    >
      <ScrollView>
        <Column spacing={12}>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            Add Exercise
          </Text>
          <NativeTextField
            label="Search"
            placeholder="Exercise name"
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
          />
          <Picker
            selectedValue={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as ExerciseType | 'all')
            }
          >
            <Picker.Item label="All types" value="all" />
            {TYPES.map((type) => (
              <Picker.Item
                key={type}
                label={EXERCISE_TYPE_LABEL[type]}
                value={type}
              />
            ))}
          </Picker>
          <Picker
            selectedValue={equipmentFilter}
            onValueChange={(value) =>
              setEquipmentFilter(value as Equipment | 'all')
            }
          >
            <Picker.Item label="All equipment" value="all" />
            {EQUIPMENT.map((equipment) => (
              <Picker.Item
                key={equipment}
                label={EQUIPMENT_LABEL[equipment]}
                value={equipment}
              />
            ))}
          </Picker>
          {exercises === undefined ? (
            <Text textStyle={{ fontSize: 17 }}>Loading Exercises…</Text>
          ) : matches.length === 0 ? (
            <ListItem supportingText="Try another search, or create a custom Exercise below.">
              No Exercises match
            </ListItem>
          ) : (
            matches.map((exercise) => (
              <ListItem
                key={exercise._id}
                onPress={() => onPick(exercise._id)}
                supportingText={[
                  EXERCISE_TYPE_LABEL[exercise.type],
                  EQUIPMENT_LABEL[exercise.equipment],
                  exercise.isCustom ? 'Custom' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                {exercise.name}
              </ListItem>
            ))
          )}
          <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
            Create a custom Exercise
          </Text>
          <NativeTextField
            label="Name"
            placeholder="For example, Landmine Press"
            value={newName}
            onChangeText={setNewName}
          />
          <Picker
            selectedValue={newType}
            onValueChange={(value) => setNewType(value as ExerciseType)}
          >
            {TYPES.map((type) => (
              <Picker.Item
                key={type}
                label={EXERCISE_TYPE_LABEL[type]}
                value={type}
              />
            ))}
          </Picker>
          <Picker
            selectedValue={newEquipment}
            onValueChange={(value) => setNewEquipment(value as Equipment)}
          >
            {EQUIPMENT.map((equipment) => (
              <Picker.Item
                key={equipment}
                label={EQUIPMENT_LABEL[equipment]}
                value={equipment}
              />
            ))}
          </Picker>
          <Button
            disabled={isCreating || newName.trim().length === 0}
            label={isCreating ? 'Creating…' : 'Create and add'}
            onPress={create}
          />
          {errorMessage ? (
            <ListItem supportingText={errorMessage}>
              Could not create Exercise
            </ListItem>
          ) : null}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
