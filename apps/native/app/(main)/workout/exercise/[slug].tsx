import { Button, ListItem, Text } from '@expo/ui';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { commentsApi, exercisesApi } from '@/lib';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const [commentBody, setCommentBody] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    if (!exercise || commentBody.trim().length === 0) {
      return;
    }

    try {
      setErrorMessage(null);
      await addComment({ exerciseId: exercise._id, body: commentBody.trim() });
      setCommentBody('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add comment.'
      );
    }
  };

  if (exercise === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading exercise…</Text>
      </NativeScreen>
    );
  }

  if (exercise === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Exercise not found
        </Text>
        <Text textStyle={{ fontSize: 17 }}>
          This exercise could not be loaded.
        </Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        {exercise.name}
      </Text>
      {exercise.category ? (
        <ListItem supportingText={exercise.category}>Category</ListItem>
      ) : null}
      <Text textStyle={{ fontSize: 17 }}>{exercise.description}</Text>
      {exercise.instructions ? (
        <ListItem supportingText={exercise.instructions}>Instructions</ListItem>
      ) : null}
      {exercise.muscleGroups?.length ? (
        <ListItem supportingText={exercise.muscleGroups.join(' · ')}>
          Muscles worked
        </ListItem>
      ) : null}
      <NativeTextField
        label="Comment"
        multiline
        numberOfLines={3}
        onChangeText={setCommentBody}
        placeholder="Leave a note about this exercise"
        value={commentBody}
      />
      <Button
        disabled={commentBody.trim().length === 0}
        label="Add comment"
        onPress={handleAddComment}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not add comment</ListItem>
      ) : null}
      <ListItem>Comments</ListItem>
      {comments === undefined ? (
        <ListItem supportingText="Loading comments…">Comments</ListItem>
      ) : comments.length === 0 ? (
        <ListItem supportingText="Be the first to add one.">
          No comments yet
        </ListItem>
      ) : (
        comments.map((comment) => (
          <ListItem key={comment._id} supportingText={comment.body}>
            {comment.userId}
          </ListItem>
        ))
      )}
    </NativeScreen>
  );
}
