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

// Session types
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';
export type ExerciseType = 'strength' | 'bodyweight' | 'cardio' | 'timed';

export type WorkoutSession = {
  _id: string;
  userId: string;
  name: string;
  status: SessionStatus;
  startedAt: number;
  completedAt?: number;
  durationSeconds?: number;
  workoutTemplateId?: string;
};

export type SessionExercise = {
  _id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  notes?: string;
  exercise: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl?: string;
    category?: string;
    muscleGroups?: string[];
    exerciseType?: ExerciseType;
  } | null;
};

export type SessionSet = {
  _id: string;
  sessionExerciseId: string;
  sessionId: string;
  setNumber: number;
  type: SetType;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  isCompleted: boolean;
  completedAt?: number;
};

export type SetMetrics = {
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
};

export const workoutSessionsApi = {
  startSession: makeFunctionReference(
    'workoutSessions:startSession'
  ) as MutationRef<{ name: string; workoutTemplateId?: string }, string>,
  completeSession: makeFunctionReference(
    'workoutSessions:completeSession'
  ) as MutationRef<{ sessionId: string }, void>,
  abandonSession: makeFunctionReference(
    'workoutSessions:abandonSession'
  ) as MutationRef<{ sessionId: string }, void>,
  getActiveSession: makeFunctionReference(
    'workoutSessions:getActiveSession'
  ) as QueryRef<EmptyArgs, WorkoutSession | null>,
  getSession: makeFunctionReference('workoutSessions:getSession') as QueryRef<
    { sessionId: string },
    WorkoutSession | null
  >,
};

export const sessionExercisesApi = {
  addExerciseToSession: makeFunctionReference(
    'sessionExercises:addExerciseToSession'
  ) as MutationRef<{ sessionId: string; exerciseId: string }, string>,
  getSessionExercises: makeFunctionReference(
    'sessionExercises:getSessionExercises'
  ) as QueryRef<{ sessionId: string }, SessionExercise[]>,
  removeExerciseFromSession: makeFunctionReference(
    'sessionExercises:removeExerciseFromSession'
  ) as MutationRef<{ sessionExerciseId: string }, void>,
  reorderExercises: makeFunctionReference(
    'sessionExercises:reorderExercises'
  ) as MutationRef<{ sessionId: string; orderedIds: string[] }, void>,
};

export const sessionSetsApi = {
  addSet: makeFunctionReference('sessionSets:addSet') as MutationRef<
    {
      sessionExerciseId: string;
      sessionId: string;
      setNumber: number;
      type?: SetType;
    },
    string
  >,
  logSet: makeFunctionReference('sessionSets:logSet') as MutationRef<
    { setId: string } & SetMetrics,
    void
  >,
  updateSet: makeFunctionReference('sessionSets:updateSet') as MutationRef<
    { setId: string } & SetMetrics,
    void
  >,
  deleteSet: makeFunctionReference('sessionSets:deleteSet') as MutationRef<
    { setId: string },
    void
  >,
  getSetsForSession: makeFunctionReference(
    'sessionSets:getSetsForSession'
  ) as QueryRef<{ sessionId: string }, SessionSet[]>,
};
