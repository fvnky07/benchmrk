import { ActionSheetIOS, Platform, Pressable, View } from 'react-native';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import type { SessionExercise, SessionSet } from '@/lib/convex/session-api';
import { type SetMetrics, SetRow } from './SetRow';

interface ActiveExerciseCardProps {
  sessionExercise: SessionExercise;
  sets: SessionSet[];
  weightUnit: 'kg' | 'lbs';
  onAddSet: () => void;
  onLogSet: (setId: string, metrics: SetMetrics) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: () => void;
}

export function ActiveExerciseCard({
  sessionExercise,
  sets,
  weightUnit,
  onAddSet,
  onLogSet,
  onDeleteSet,
  onRemoveExercise,
}: Readonly<ActiveExerciseCardProps>) {
  const exercise = sessionExercise.exercise;
  const exerciseName = exercise?.name ?? 'Unknown Exercise';
  const imageUrl = exercise?.imageUrl;
  const exerciseType = exercise?.exerciseType;

  const handleMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove Exercise'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: exerciseName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onRemoveExercise();
          }
        }
      );
    } else {
      const { Alert } = require('react-native');
      Alert.alert(exerciseName, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Exercise',
          style: 'destructive',
          onPress: onRemoveExercise,
        },
      ]);
    }
  };

  return (
    <View className="mb-3 rounded-2xl border border-white/10 bg-black-3 px-4 py-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <Avatar className="size-10 rounded-xl" alt={exerciseName}>
            {imageUrl ? <AvatarImage source={{ uri: imageUrl }} /> : null}
            <AvatarFallback className="rounded-xl bg-green-1/20">
              <Text className="font-semibold text-green-1 text-sm">
                {exerciseName.slice(0, 1)}
              </Text>
            </AvatarFallback>
          </Avatar>
          <Text
            className="flex-1 font-semibold text-base text-white"
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={onAddSet}
            className="flex-row items-center gap-1 rounded-lg px-3 py-2 active:opacity-70"
            hitSlop={4}
          >
            <Text className="font-medium text-green-1 text-sm">+ Set</Text>
          </Pressable>
          <Pressable
            onPress={handleMenu}
            className="rounded-lg p-2 active:opacity-70"
            hitSlop={4}
          >
            <Text className="text-lg text-white/50 leading-none">⋯</Text>
          </Pressable>
        </View>
      </View>

      {sets.length === 0 ? (
        <View className="py-2">
          <Text className="text-center text-sm text-white/30">
            Tap + Set to add your first set
          </Text>
        </View>
      ) : (
        <View>
          <View className="mb-1 flex-row items-center justify-between px-1">
            <Text className="w-8 text-center text-white/30 text-xs">#</Text>
            <Text className="flex-1 text-center text-white/30 text-xs">
              {exerciseType === 'cardio'
                ? 'km · min'
                : exerciseType === 'timed'
                  ? 'sec'
                  : exerciseType === 'bodyweight'
                    ? 'reps'
                    : `${weightUnit} × reps`}
            </Text>
            <View className="w-10" />
          </View>

          {sets.map((set) => (
            <SetRow
              key={set._id}
              setNumber={set.setNumber}
              exerciseType={exerciseType}
              isCompleted={set.isCompleted}
              reps={set.reps}
              weightKg={set.weightKg}
              durationSeconds={set.durationSeconds}
              distanceMeters={set.distanceMeters}
              weightUnit={weightUnit}
              onLog={(metrics) => onLogSet(set._id, metrics)}
              onDelete={() => onDeleteSet(set._id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
