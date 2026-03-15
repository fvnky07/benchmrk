import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export type ExerciseType = 'strength' | 'bodyweight' | 'cardio' | 'timed';

export interface SetMetrics {
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
}

interface SetRowProps {
  setNumber: number;
  exerciseType?: ExerciseType;
  isCompleted: boolean;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  weightUnit: 'kg' | 'lbs';
  onLog: (metrics: SetMetrics) => void;
  onDelete: () => void;
}

export function SetRow({
  setNumber,
  exerciseType,
  isCompleted,
  reps,
  weightKg,
  durationSeconds,
  distanceMeters,
  weightUnit,
  onLog,
  onDelete,
}: Readonly<SetRowProps>) {
  const [localReps, setLocalReps] = useState(reps?.toString() ?? '');
  const [localWeight, setLocalWeight] = useState(weightKg?.toString() ?? '');
  const [localDuration, setLocalDuration] = useState(
    durationSeconds?.toString() ?? ''
  );
  const [localDistance, setLocalDistance] = useState(
    distanceMeters?.toString() ?? ''
  );

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const metrics: SetMetrics = {};
    if (localReps) metrics.reps = parseInt(localReps, 10);
    if (localWeight) metrics.weightKg = parseFloat(localWeight);
    if (localDuration) metrics.durationSeconds = parseInt(localDuration, 10);
    if (localDistance) metrics.distanceMeters = parseFloat(localDistance);
    onLog(metrics);
  };

  // Shared input style
  const inputClass =
    'w-16 rounded-lg border border-white/20 bg-black-2 px-2 py-2 text-center text-white text-sm';

  const renderInputs = () => {
    const type = exerciseType ?? 'strength';
    switch (type) {
      case 'strength':
        return (
          <View className="flex-row items-center gap-2">
            <View className="items-center">
              <Text className="mb-1 text-white/40 text-xs">{weightUnit}</Text>
              <TextInput
                className={inputClass}
                value={localWeight}
                onChangeText={setLocalWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                editable={!isCompleted}
              />
            </View>
            <Text className="text-white/40">×</Text>
            <View className="items-center">
              <Text className="mb-1 text-white/40 text-xs">reps</Text>
              <TextInput
                className={inputClass}
                value={localReps}
                onChangeText={setLocalReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                editable={!isCompleted}
              />
            </View>
          </View>
        );
      case 'bodyweight':
        return (
          <View className="items-center">
            <Text className="mb-1 text-white/40 text-xs">reps</Text>
            <TextInput
              className={inputClass}
              value={localReps}
              onChangeText={setLocalReps}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={!isCompleted}
            />
          </View>
        );
      case 'cardio':
        return (
          <View className="flex-row items-center gap-2">
            <View className="items-center">
              <Text className="mb-1 text-white/40 text-xs">km</Text>
              <TextInput
                className={inputClass}
                value={localDistance}
                onChangeText={setLocalDistance}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                editable={!isCompleted}
              />
            </View>
            <Text className="text-white/40">·</Text>
            <View className="items-center">
              <Text className="mb-1 text-white/40 text-xs">min</Text>
              <TextInput
                className={inputClass}
                value={localDuration}
                onChangeText={setLocalDuration}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                editable={!isCompleted}
              />
            </View>
          </View>
        );
      case 'timed':
        return (
          <View className="items-center">
            <Text className="mb-1 text-white/40 text-xs">sec</Text>
            <TextInput
              className={inputClass}
              value={localDuration}
              onChangeText={setLocalDuration}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={!isCompleted}
            />
          </View>
        );
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between py-2 ${isCompleted ? 'opacity-60' : ''}`}
    >
      <View className="w-8 items-center">
        <Text className="text-sm text-white/50">{setNumber}</Text>
      </View>

      <View className="flex-1 items-center">{renderInputs()}</View>

      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-xl ${isCompleted ? 'bg-green-1/20' : 'bg-green-1/10'}`}
        onPress={handleComplete}
        disabled={isCompleted}
      >
        <Text
          className={`text-lg ${isCompleted ? 'text-green-1' : 'text-white/40'}`}
        >
          {isCompleted ? '✓' : '○'}
        </Text>
      </Button>
    </View>
  );
}
