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

  // Comments on exercises
  exerciseComments: defineTable({
    exerciseId: v.id('exercises'),
    userId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_exercise', ['exerciseId']),
});
