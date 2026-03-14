import { type FunctionReference, makeFunctionReference } from 'convex/server';

type QueryRef<
  TArgs extends Record<string, unknown>,
  TReturn,
> = FunctionReference<'query', 'public', TArgs, TReturn>;

type MutationRef<
  TArgs extends Record<string, unknown>,
  TReturn,
> = FunctionReference<'mutation', 'public', TArgs, TReturn>;

type EmptyArgs = Record<string, never>;

export type ExerciseSummary = {
  _id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl?: string;
  category?: string;
  muscleGroups?: string[];
};

export type ExerciseDetail = ExerciseSummary & {
  instructions?: string;
};

export type WorkoutSummary = {
  _id: string;
  name: string;
  userId: string;
  createdAt: number;
};

export type ExerciseComment = {
  _id: string;
  userId: string;
  body: string;
  createdAt: number;
};

export const workoutsApi = {
  listWorkouts: makeFunctionReference('workouts:listWorkouts') as QueryRef<
    EmptyArgs,
    WorkoutSummary[]
  >,
  getWorkout: makeFunctionReference('workouts:getWorkout') as QueryRef<
    { workoutId: string },
    WorkoutSummary | null
  >,
  createWorkout: makeFunctionReference('workouts:createWorkout') as MutationRef<
    { name: string },
    string
  >,
};

export const workoutExercisesApi = {
  addExercisesToWorkout: makeFunctionReference(
    'workoutExercises:addExercisesToWorkout'
  ) as MutationRef<
    {
      workoutId: string;
      exercises: Array<{
        exerciseId: string;
        sets: number;
        reps: number;
        weight: number;
      }>;
    },
    string[]
  >,
  getWorkoutExercises: makeFunctionReference(
    'workoutExercises:getWorkoutExercises'
  ) as QueryRef<
    { workoutId: string },
    Array<{
      _id: string;
      workoutId: string;
      exerciseId: string;
      order: number;
      sets: number;
      reps: number;
      weight: number;
      exercise: ExerciseDetail;
    }>
  >,
};

export const exercisesApi = {
  listExercises: makeFunctionReference('exercises:listExercises') as QueryRef<
    EmptyArgs,
    ExerciseSummary[]
  >,
  getExerciseBySlug: makeFunctionReference(
    'exercises:getExerciseBySlug'
  ) as QueryRef<{ slug: string }, ExerciseDetail | null>,
};

export const commentsApi = {
  listComments: makeFunctionReference(
    'exerciseComments:listComments'
  ) as QueryRef<{ exerciseId: string }, ExerciseComment[]>,
  addComment: makeFunctionReference(
    'exerciseComments:addComment'
  ) as MutationRef<{ exerciseId: string; body: string }, string>,
};
