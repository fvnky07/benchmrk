import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
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

function ExercisePickerContent({
  sessionId,
  onClose,
  onExerciseAdded,
}: Omit<ExercisePickerProps, 'isOpen'>) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const exercises = useQuery(exercisesApi.listExercises);
  const addExercise = useMutation(sessionExercisesApi.addExerciseToSession);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((ex) => {
      const matchesSearch = ex.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' ||
        ex.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [exercises, search, selectedCategory]);

  const handleSelect = async (exercise: ExerciseSummary) => {
    try {
      const id = await addExercise({
        sessionId,
        exerciseId: exercise._id,
      });
      onExerciseAdded(id);
      onClose();
    } catch {
      // Exercise already added or session not active — silently close
      onClose();
    }
  };

  return (
    <View className="flex-1 bg-black-1">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="font-semibold text-lg text-white">Add Exercise</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text className="text-white/50">✕</Text>
        </Pressable>
      </View>

      <View className="mx-4 mb-3 flex-row items-center rounded-xl border border-white/10 bg-black-3 px-3 py-2">
        <Text className="mr-2 text-white/40">⌕</Text>
        <TextInput
          className="flex-1 text-white"
          placeholder="Search exercises..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-2 ${
              selectedCategory === cat
                ? 'bg-green-1'
                : 'border border-white/15 bg-black-3'
            }`}
          >
            <Text
              className={`font-medium text-sm ${
                selectedCategory === cat ? 'text-black' : 'text-white/70'
              }`}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlashList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelect(item)}
            className="flex-row items-center gap-3 px-4 py-3 active:opacity-70"
          >
            <Avatar className="size-12 rounded-xl" alt={item.name}>
              {item.imageUrl ? (
                <AvatarImage source={{ uri: item.imageUrl }} />
              ) : null}
              <AvatarFallback className="rounded-xl bg-green-1/20">
                <Text className="font-semibold text-green-1">
                  {item.name.slice(0, 1)}
                </Text>
              </AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <Text className="font-medium text-white">{item.name}</Text>
              {item.category ? (
                <Text className="text-sm text-white/50">{item.category}</Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-white/40">No exercises found</Text>
          </View>
        }
      />
    </View>
  );
}

export function ExercisePicker({
  sessionId,
  isOpen,
  onClose,
  onExerciseAdded,
}: Readonly<ExercisePickerProps>) {
  if (Platform.OS === 'ios') {
    // Lazy import to avoid Android crash
    const { BottomSheet } = require('@expo/ui/swift-ui');
    return (
      <BottomSheet
        isOpened={isOpen}
        onIsOpenedChange={(open: boolean) => {
          if (!open) onClose();
        }}
        presentationDetents={['medium', 0.9]}
        presentationDragIndicator="visible"
      >
        <ExercisePickerContent
          sessionId={sessionId}
          onClose={onClose}
          onExerciseAdded={onExerciseAdded}
        />
      </BottomSheet>
    );
  }

  // Android fallback: Modal
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black-1" edges={['top', 'bottom']}>
        <ExercisePickerContent
          sessionId={sessionId}
          onClose={onClose}
          onExerciseAdded={onExerciseAdded}
        />
      </SafeAreaView>
    </Modal>
  );
}
