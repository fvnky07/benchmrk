import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { commentsApi, exercisesApi, showToast } from '@/lib';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const [commentBody, setCommentBody] = useState('');
  const exercise = useQuery(
    exercisesApi.getExerciseBySlug,
    params.slug ? { slug: params.slug } : 'skip'
  );
  const comments = useQuery(
    commentsApi.listComments,
    exercise ? { exerciseId: exercise._id } : 'skip'
  );
  const addComment = useMutation(commentsApi.addComment);

  const handleAddComment = async () => {
    if (!exercise) {
      return;
    }

    try {
      await addComment({
        exerciseId: exercise._id,
        body: commentBody,
      });
      setCommentBody('');
      showToast.success('Comment added', 'Your note has been posted.');
    } catch (error) {
      showToast.error(
        'Unable to add comment',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  if (exercise === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading exercise…</Text>
      </View>
    );
  }

  if (exercise === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1 px-6">
        <Text className="font-semibold text-lg text-white">
          Exercise not found
        </Text>
        <Text className="mt-2 text-center text-white/60">
          This exercise could not be loaded.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-6 gap-4 rounded-3xl bg-black-3 px-4 py-5">
          <View className="flex-row gap-4">
            <Avatar className="size-20 rounded-3xl" alt={exercise.name}>
              {exercise.imageUrl ? (
                <AvatarImage source={{ uri: exercise.imageUrl }} />
              ) : null}
              <AvatarFallback className="rounded-3xl bg-green-1/20">
                <Text className="font-semibold text-2xl text-green-1">
                  {exercise.name.slice(0, 1)}
                </Text>
              </AvatarFallback>
            </Avatar>

            <View className="flex-1 gap-2">
              <Text className="font-semibold text-2xl text-white">
                {exercise.name}
              </Text>
              {exercise.category ? (
                <Text className="text-green-1 text-sm">
                  {exercise.category}
                </Text>
              ) : null}
              <Text className="text-white/60">{exercise.description}</Text>
            </View>
          </View>

          {exercise.instructions ? (
            <View className="gap-2">
              <Text className="font-semibold text-lg text-white">
                Instructions
              </Text>
              <Text className="text-white/70">{exercise.instructions}</Text>
            </View>
          ) : null}

          {exercise.muscleGroups?.length ? (
            <View className="gap-2">
              <Text className="font-semibold text-lg text-white">
                Muscles worked
              </Text>
              <Text className="text-white/70">
                {exercise.muscleGroups.join(' • ')}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mb-4 gap-3 rounded-3xl bg-black-3 px-4 py-5">
          <Text className="font-semibold text-lg text-white">Comments</Text>
          <Input
            value={commentBody}
            onChangeText={setCommentBody}
            placeholder="Leave a note about this exercise"
            placeholderTextColor="#777"
            className="h-12 border-white/10 bg-black-2 text-white"
          />
          <Button className="bg-green-1" onPress={handleAddComment}>
            <Text>Add comment</Text>
          </Button>
        </View>

        <View className="gap-3 pb-6">
          {(comments ?? []).length === 0 ? (
            <View className="rounded-2xl border border-white/15 border-dashed bg-black-3 px-4 py-5">
              <Text className="text-white/60">
                No comments yet. Be the first to add one.
              </Text>
            </View>
          ) : (
            (comments ?? []).map((comment) => (
              <View
                key={comment._id}
                className="rounded-2xl border border-white/10 bg-black-3 px-4 py-4"
              >
                <Text className="font-semibold text-white">
                  {comment.userId}
                </Text>
                <Text className="mt-2 text-white/70">{comment.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
