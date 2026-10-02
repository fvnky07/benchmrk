import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const memberSettingsFields = {
  appearance: v.union(
    v.literal('system'),
    v.literal('light'),
    v.literal('dark')
  ),
  units: v.union(v.literal('kg'), v.literal('lb')),
  effortScale: v.union(v.literal('RPE'), v.literal('RIR')),
  defaultRestSeconds: v.number(),
  haptics: v.boolean(),
  analyticsOptOut: v.boolean(),
};

export const exerciseTypeValidator = v.union(
  v.literal('strength'),
  v.literal('bodyweight'),
  v.literal('timed'),
  v.literal('cardio')
);

export const equipmentValidator = v.union(
  v.literal('barbell'),
  v.literal('dumbbell'),
  v.literal('machine'),
  v.literal('cable'),
  v.literal('bodyweight'),
  v.literal('other')
);

export const setTypeValidator = v.union(
  v.literal('normal'),
  v.literal('warmup'),
  v.literal('dropset'),
  v.literal('failure')
);

export default defineSchema({
  // Waitlist entries; confirming the emailed link creates a Waitlist identity.
  waitlist: defineTable({
    email: v.string(),
    position: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_position', ['position']),

  // Last native sign-in link mailed per email, to rate-limit requests.
  magicLinkRequests: defineTable({
    email: v.string(),
    lastSentAt: v.number(),
  }).index('by_email', ['email']),

  // Website deletion requests (Google Play). Only the SHA-256 of the emailed
  // token is stored; a request counts once `confirmedAt` is set.
  deletionRequests: defineTable({
    email: v.string(),
    tokenHash: v.string(),
    linkSentAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_tokenHash', ['tokenHash']),

  memberSettings: defineTable({
    userId: v.string(),
    ...memberSettingsFields,
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  // Shared catalog Exercises have no creator; custom ones belong to `createdBy`.
  exercises: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    muscleGroups: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    type: exerciseTypeValidator,
    equipment: equipmentValidator,
    createdBy: v.optional(v.string()),
  })
    .index('by_slug', ['slug'])
    .index('by_createdBy', ['createdBy']),

  routines: defineTable({
    userId: v.string(),
    name: v.string(),
    exerciseCount: v.number(),
    targetDurationSeconds: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  routineExercises: defineTable({
    routineId: v.id('routines'),
    exerciseId: v.id('exercises'),
    order: v.number(),
    targetSets: v.number(),
    repRangeMin: v.number(),
    repRangeMax: v.number(),
    setRepTargets: v.array(v.number()),
    startingWeightKg: v.optional(v.number()),
    stepKg: v.number(),
    plannedRestSeconds: v.optional(v.number()),
  }).index('by_routine', ['routineId', 'order']),

  workouts: defineTable({
    userId: v.string(),
    name: v.string(),
    routineId: v.optional(v.id('routines')),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('abandoned')
    ),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    finishReason: v.optional(
      v.union(v.literal('all_sets_done'), v.literal('terminated_early'))
    ),
  })
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_started', ['userId', 'startedAt']),

  // A Workout's Exercises; planning fields are copied from the Routine at start.
  workoutExercises: defineTable({
    workoutId: v.id('workouts'),
    exerciseId: v.id('exercises'),
    routineExerciseId: v.optional(v.id('routineExercises')),
    order: v.number(),
    repRangeMin: v.number(),
    repRangeMax: v.number(),
    stepKg: v.number(),
    plannedRestSeconds: v.optional(v.number()),
  }).index('by_workout', ['workoutId', 'order']),

  sets: defineTable({
    userId: v.string(),
    workoutId: v.id('workouts'),
    workoutExerciseId: v.id('workoutExercises'),
    exerciseId: v.id('exercises'),
    order: v.number(),
    type: setTypeValidator,
    weightKg: v.optional(v.number()),
    reps: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    distanceMeters: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_workoutExercise', ['workoutExerciseId', 'order'])
    .index('by_workout', ['workoutId']),

  // Comments on exercises
  exerciseComments: defineTable({
    exerciseId: v.id('exercises'),
    userId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_exercise', ['exerciseId']),
});
