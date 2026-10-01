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

  // Comments on exercises
  exerciseComments: defineTable({
    exerciseId: v.id('exercises'),
    userId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_exercise', ['exerciseId']),
});
