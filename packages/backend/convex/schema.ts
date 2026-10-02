import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/** Configurable chips in the Workout's quick action row (the Group chip isn't). */
export const quickActionIdValidator = v.union(
  v.literal('wand'),
  v.literal('addSet'),
  v.literal('info'),
  v.literal('swap'),
  v.literal('note'),
  v.literal('setup'),
  v.literal('plates')
);

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
  quickActions: v.array(
    v.object({ id: quickActionIdValidator, visible: v.boolean() })
  ),
  /** The first-run "swipe right on a Set" hint was dismissed. */
  swipeHintDismissed: v.boolean(),
  /** Rest-end notifications play a sound. */
  restEndSound: v.boolean(),
  /** Overload targets everywhere; off suppresses computing and showing them. */
  overloadTargets: v.boolean(),
  /** Exercises the member switched Overload targets off for. */
  targetsOffExerciseIds: v.array(v.id('exercises')),
  /** The smallest weight change a smaller jump can use, in kg. */
  smallestIncrementKg: v.number(),
  /** After a Set in Alternating sets, move to the next Exercise of the round. */
  autoAdvance: v.boolean(),
  /** The bar and plate inventory the plate calculator loads from. */
  plates: v.object({
    unit: v.union(v.literal('kg'), v.literal('lb')),
    barWeight: v.number(),
    plates: v.array(v.object({ weight: v.number(), pairs: v.number() })),
  }),
  /** Quiet ahead/behind text beside the progress row. */
  aheadBehind: v.boolean(),
};

/** Saved settings hold only what a member changed; reads fill in defaults. */
export const memberSettingsChangeFields = {
  appearance: v.optional(memberSettingsFields.appearance),
  units: v.optional(memberSettingsFields.units),
  effortScale: v.optional(memberSettingsFields.effortScale),
  defaultRestSeconds: v.optional(memberSettingsFields.defaultRestSeconds),
  haptics: v.optional(memberSettingsFields.haptics),
  analyticsOptOut: v.optional(memberSettingsFields.analyticsOptOut),
  quickActions: v.optional(memberSettingsFields.quickActions),
  swipeHintDismissed: v.optional(memberSettingsFields.swipeHintDismissed),
  restEndSound: v.optional(memberSettingsFields.restEndSound),
  overloadTargets: v.optional(memberSettingsFields.overloadTargets),
  targetsOffExerciseIds: v.optional(memberSettingsFields.targetsOffExerciseIds),
  smallestIncrementKg: v.optional(memberSettingsFields.smallestIncrementKg),
  autoAdvance: v.optional(memberSettingsFields.autoAdvance),
  plates: v.optional(memberSettingsFields.plates),
  aheadBehind: v.optional(memberSettingsFields.aheadBehind),
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

/** What other Group members see of a member's Workout, and nothing more. */
export const groupProgressValidator = v.object({
  status: v.union(
    v.literal('not_started'),
    v.literal('working'),
    v.literal('resting'),
    v.literal('finished')
  ),
  routineName: v.union(v.string(), v.null()),
  startedAt: v.union(v.number(), v.null()),
  currentExercise: v.union(v.string(), v.null()),
  setNumber: v.number(),
  setCount: v.number(),
  setsDone: v.number(),
  setsPlanned: v.number(),
  restEndsAt: v.union(v.number(), v.null()),
});

export const overloadReasonValidator = v.union(
  v.literal('baseline'),
  v.literal('routine-target'),
  v.literal('rep-progression'),
  v.literal('weight-increase'),
  v.literal('hold-below-range'),
  v.literal('smaller-jump')
);

export const setTargetValidator = v.object({
  weightKg: v.union(v.number(), v.null()),
  reps: v.number(),
});

export const overloadBasisValidator = v.object({
  reason: overloadReasonValidator,
  /** A Working Set last time was unrated; it counted as passing. */
  effortNotChecked: v.boolean(),
  /** Every Working Set reached the top, but one was rated above RPE 9. */
  effortBlocked: v.boolean(),
  /** Three consecutive Stalled Workouts. */
  plateau: v.boolean(),
  /** The Rep range changed since last time; never a stall. */
  repRangeChanged: v.boolean(),
  /** The member edited the target; an override is never penalised. */
  edited: v.boolean(),
  /** Declined for this Workout: no targets, never a stall. */
  declined: v.boolean(),
});

/** An Alternating sets round: one Set of every block Exercise with Sets left. */
export const roundValidator = v.object({
  number: v.number(),
  required: v.array(v.id('workoutExercises')),
  done: v.array(v.id('workoutExercises')),
  skipped: v.array(v.id('workoutExercises')),
});

/** A Machine setup's labelled positions. */
export const machinePositionsValidator = v.object({
  seat: v.optional(v.number()),
  back: v.optional(v.number()),
  pin: v.optional(v.number()),
  angle: v.optional(v.number()),
});

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
    ...memberSettingsChangeFields,
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
    /** Its Alternating sets block in this Routine. */
    blockId: v.optional(v.id('routineBlocks')),
  }).index('by_routine', ['routineId', 'order']),

  // A Routine's Alternating sets blocks, each with its own planned rest.
  routineBlocks: defineTable({
    routineId: v.id('routines'),
    plannedRestSeconds: v.optional(v.number()),
  }).index('by_routine', ['routineId']),

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
    /** Rest between Sets; Groups and the live status read it. */
    rest: v.optional(
      v.object({
        startedAt: v.number(),
        plannedSeconds: v.number(),
        adjustedSeconds: v.number(),
      })
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
    /** Skipped for this Workout: its unlogged Sets stop counting. */
    skipped: v.optional(v.boolean()),
    /** What this Workout's Overload targets are based on; absent when targets are off or don't apply. */
    overload: v.optional(overloadBasisValidator),
    /** The Plateau flag was dismissed while this was the newest exposure; it shows again after a newer one. */
    plateauDismissed: v.optional(v.boolean()),
    /** Its Alternating sets block in this Workout. */
    blockId: v.optional(v.id('workoutBlocks')),
  }).index('by_workout', ['workoutId', 'order']),

  // A Workout's Alternating sets blocks: planned rest, the open round and the
  // rounds credited so far. Membership is on the Workout Exercises.
  workoutBlocks: defineTable({
    workoutId: v.id('workouts'),
    routineBlockId: v.optional(v.id('routineBlocks')),
    plannedRestSeconds: v.optional(v.number()),
    round: v.optional(roundValidator),
    completedRounds: v.array(
      v.object({ ...roundValidator.fields, completedAt: v.number() })
    ),
  }).index('by_workout', ['workoutId']),

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
    /** Effort, stored canonically as RPE in 0.5 steps. */
    rpe: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    /** The Overload target shown for this planned Set, saved when it was planned. */
    target: v.optional(setTargetValidator),
    /** Which logged values came from the target (cleared when the member edits them). */
    fromTarget: v.optional(
      v.object({ weight: v.boolean(), reps: v.boolean() })
    ),
    /** Timed and cardio Sets show the previous Workout's Set instead of a target. */
    previous: v.optional(
      v.object({
        durationSeconds: v.optional(v.number()),
        distanceMeters: v.optional(v.number()),
      })
    ),
  })
    .index('by_workoutExercise', ['workoutExerciseId', 'order'])
    .index('by_workout', ['workoutId'])
    .index('by_user_exercise', ['userId', 'exerciseId'])
    .index('by_userId', ['userId']),

  // A member's note, attached to exactly one target: a Set, an Exercise (a
  // standing note shown every time it comes up) or a Workout.
  notes: defineTable({
    userId: v.string(),
    kind: v.union(
      v.literal('set'),
      v.literal('exercise'),
      v.literal('workout')
    ),
    setId: v.optional(v.id('sets')),
    exerciseId: v.optional(v.id('exercises')),
    /** The Workout of a Workout note, and of a Set note for listing. */
    workoutId: v.optional(v.id('workouts')),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_user_workout', ['userId', 'workoutId'])
    .index('by_user_exercise', ['userId', 'kind', 'exerciseId'])
    .index('by_set', ['setId']),

  // One Machine setup per member per machine or cable Exercise.
  machineSetups: defineTable({
    userId: v.string(),
    exerciseId: v.id('exercises'),
    positions: machinePositionsValidator,
    custom: v.array(v.object({ label: v.string(), value: v.string() })),
    updatedAt: v.number(),
  }).index('by_user_exercise', ['userId', 'exerciseId']),

  // Comments on exercises
  exerciseComments: defineTable({
    exerciseId: v.id('exercises'),
    userId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  })
    .index('by_exercise', ['exerciseId'])
    .index('by_userId', ['userId']),

  // A live shared session; each member runs their own Workout.
  groups: defineTable({
    hostId: v.string(),
    status: v.union(v.literal('live'), v.literal('ended')),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
    lastActivityAt: v.number(),
  }),

  // Membership in a Group, with the only Workout data others may read: the
  // progress summary the member's own mutations keep current.
  groupMemberships: defineTable({
    groupId: v.id('groups'),
    userId: v.string(),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    progress: groupProgressValidator,
  })
    .index('by_user_left', ['userId', 'leftAt'])
    .index('by_group_left', ['groupId', 'leftAt', 'joinedAt']),

  // Short join codes; valid until revoked, the Group ends or 24 hours unused.
  groupCodes: defineTable({
    groupId: v.id('groups'),
    code: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index('by_code', ['code'])
    .index('by_group', ['groupId']),
});
