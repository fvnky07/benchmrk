import { Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { TrendCard } from '@/components/charts/trend-card';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, textColor, useColors } from '@/lib/ui';

export default function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const [commentBody, setCommentBody] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exercise = useQuery(
    api.exercises.getBySlug,
    params.slug ? { slug: params.slug } : 'skip'
  );
  const trends = useQuery(
    api.trends.forExercise,
    exercise ? { exerciseId: exercise._id } : 'skip'
  );
  const comments = useQuery(
    api.exerciseComments.listComments,
    exercise ? { exerciseId: exercise._id } : 'skip'
  );
  const addComment = useMutation(api.exerciseComments.addComment);

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

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };

  if (exercise === undefined) {
    return (
      <NativeScreen>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading exercise…
        </Text>
      </NativeScreen>
    );
  }

  if (exercise === null) {
    return (
      <NativeScreen>
        <Text
          textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
        >
          Exercise not found
        </Text>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          This exercise could not be loaded.
        </Text>
      </NativeScreen>
    );
  }

  const hasDetails =
    Boolean(exercise.description) ||
    Boolean(exercise.instructions) ||
    Boolean(exercise.muscleGroups?.length);

  return (
    <NativeScreen>
      <Column spacing={space.xs}>
        <Text
          textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
        >
          {exercise.name}
        </Text>
        {exercise.category ? (
          <Text textStyle={caption}>{exercise.category}</Text>
        ) : null}
      </Column>
      {hasDetails ? (
        <Card divided>
          {exercise.description ? (
            <CardRow key="description" supportingText={exercise.description}>
              Description
            </CardRow>
          ) : null}
          {exercise.instructions ? (
            <CardRow key="instructions" supportingText={exercise.instructions}>
              Instructions
            </CardRow>
          ) : null}
          {exercise.muscleGroups?.length ? (
            <CardRow
              key="muscles"
              supportingText={exercise.muscleGroups.join(' · ')}
            >
              Muscles worked
            </CardRow>
          ) : null}
        </Card>
      ) : null}
      {trends === undefined ? (
        <Text textStyle={caption}>Loading trends…</Text>
      ) : (
        <TrendCard duration={trends.duration} rest={trends.rest} />
      )}
      <SectionHeader title="Comments" />
      {comments === undefined ? (
        <Text textStyle={caption}>Loading comments…</Text>
      ) : comments.length === 0 ? (
        <Card>
          <CardRow supportingText="Be the first to add one.">
            No comments yet
          </CardRow>
        </Card>
      ) : (
        <Card divided>
          {comments.map((comment) => (
            <CardRow key={comment._id} supportingText={comment.body}>
              {comment.userId}
            </CardRow>
          ))}
        </Card>
      )}
      <Card padding={space.lg} spacing={space.md}>
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
      </Card>
      {errorMessage ? (
        <Card tone="high" padding={space.lg} spacing={space.xs}>
          <Text
            textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
          >
            Could not add comment
          </Text>
          <Text textStyle={{ ...font.caption, color: textColor(colors.error) }}>
            {errorMessage}
          </Text>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
