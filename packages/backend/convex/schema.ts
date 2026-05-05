// NOTE: Main app schema - waitlist table for tracking signups
// before confirmation. Once confirmed via magic link, users
// become Better Auth users with premiumUntil timestamp.
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // NOTE: Waitlist table for tracking users before they
  // confirm via magic link
  waitlist: defineTable({
    email: v.string(),
    position: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_position', ['position']),

  // NOTE: User preferences — one row per user, lazily created
  // on first settings access with smart defaults
  user_preferences: defineTable({
    userId: v.string(),

    // Appearance
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),

    // Workout — general
    defaultRestTimer: v.number(),
    weightUnit: v.union(v.literal('kg'), v.literal('lbs')),

    // Workout — tracking
    autoSaveWorkouts: v.boolean(),
    syncToCloud: v.boolean(),

    // Integrations
    appleHealthEnabled: v.boolean(),
    stravaEnabled: v.boolean(),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  // Exercises catalog (seeded by init.ts)
  exercises: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    muscleGroups: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    exerciseType: v.optional(
      v.union(
        v.literal('strength'), // weight + reps
        v.literal('bodyweight'), // reps only
        v.literal('cardio'), // distance + duration
        v.literal('timed') // duration only
      )
    ),
    isCustom: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
  }).index('by_slug', ['slug']),

  // User saved workouts (max 3 for free tier)
  workouts: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),

  // Join table: which exercises belong to a workout + config
  workoutExercises: defineTable({
    workoutId: v.id('workouts'),
    exerciseId: v.id('exercises'),
    order: v.number(),
    sets: v.number(),
    reps: v.number(),
    weight: v.number(),
  })
    .index('by_workout', ['workoutId'])
    .index('by_exercise', ['exerciseId'])
    .index('by_workout_exercise', ['workoutId', 'exerciseId']),

  // Comments on exercises
  exerciseComments: defineTable({
    exerciseId: v.id('exercises'),
    userId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_exercise', ['exerciseId']),

  workoutSessions: defineTable({
    userId: v.string(),
    name: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('abandoned')
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    workoutTemplateId: v.optional(v.id('workouts')),
  })
    .index('by_userId', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_started', ['userId', 'startedAt']),

  sessionExercises: defineTable({
    sessionId: v.id('workoutSessions'),
    exerciseId: v.id('exercises'),
    order: v.number(),
    notes: v.optional(v.string()),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_order', ['sessionId', 'order']),

  sessionSets: defineTable({
    sessionExerciseId: v.id('sessionExercises'),
    sessionId: v.id('workoutSessions'),
    setNumber: v.number(),
    type: v.union(
      v.literal('normal'),
      v.literal('warmup'),
      v.literal('dropset'),
      v.literal('failure')
    ),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    distanceMeters: v.optional(v.number()),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index('by_session_exercise', ['sessionExerciseId'])
    .index('by_session', ['sessionId']),
});
