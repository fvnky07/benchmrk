import { ConvexError, type Infer, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { type MutationCtx, mutation } from './_generated/server';
import { requireVisibleExercise } from './lib/exercises';
import { requireIdentityId } from './lib/identity';
import { requireOwnedSet, requireOwnedWorkout } from './lib/workoutData';

const MAX_NOTE_LENGTH = 1000;

/** Exactly one target per note: a Set, an Exercise or a Workout. */
export const noteTargetValidator = v.union(
  v.object({ kind: v.literal('set'), setId: v.id('sets') }),
  v.object({ kind: v.literal('exercise'), exerciseId: v.id('exercises') }),
  v.object({ kind: v.literal('workout'), workoutId: v.id('workouts') })
);

type NoteTarget = Infer<typeof noteTargetValidator>;

/** A deleted Set takes its note with it. */
export async function deleteSetNote(
  ctx: MutationCtx,
  setId: Doc<'sets'>['_id']
) {
  const note = await ctx.db
    .query('notes')
    .withIndex('by_set', (q) => q.eq('setId', setId))
    .unique();
  if (note) await ctx.db.delete(note._id);
}

/** The target's stored fields and its existing note, after ownership checks. */
async function resolveTarget(
  ctx: MutationCtx,
  userId: string,
  target: NoteTarget
): Promise<{
  fields: Pick<Doc<'notes'>, 'kind' | 'setId' | 'exerciseId' | 'workoutId'>;
  existing: Doc<'notes'> | null;
}> {
  switch (target.kind) {
    case 'set': {
      const { set } = await requireOwnedSet(ctx, userId, target.setId);
      const existing = await ctx.db
        .query('notes')
        .withIndex('by_set', (q) => q.eq('setId', set._id))
        .unique();
      return {
        fields: { kind: 'set', setId: set._id, workoutId: set.workoutId },
        existing,
      };
    }
    case 'exercise': {
      const exercise = await requireVisibleExercise(
        ctx,
        userId,
        target.exerciseId
      );
      const existing = await ctx.db
        .query('notes')
        .withIndex('by_user_exercise', (q) =>
          q
            .eq('userId', userId)
            .eq('kind', 'exercise')
            .eq('exerciseId', exercise._id)
        )
        .unique();
      return {
        fields: { kind: 'exercise', exerciseId: exercise._id },
        existing,
      };
    }
    case 'workout': {
      const workout = await requireOwnedWorkout(ctx, userId, target.workoutId);
      const notes = await ctx.db
        .query('notes')
        .withIndex('by_user_workout', (q) =>
          q.eq('userId', userId).eq('workoutId', workout._id)
        )
        .collect();
      return {
        fields: { kind: 'workout', workoutId: workout._id },
        existing: notes.find((note) => note.kind === 'workout') ?? null,
      };
    }
  }
}

/**
 * Saves the note on its one target; empty text removes it. A standing
 * Exercise note shows in every Workout with that Exercise. Notes stay the
 * member's own and never enter Group data.
 */
export const save = mutation({
  args: { target: noteTargetValidator, text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const text = args.text.trim();
    if (text.length > MAX_NOTE_LENGTH) throw new ConvexError('NOTE_TOO_LONG');
    const { fields, existing } = await resolveTarget(ctx, userId, args.target);
    if (!text) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { text, updatedAt: Date.now() });
    } else {
      await ctx.db.insert('notes', {
        ...fields,
        userId,
        text,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
