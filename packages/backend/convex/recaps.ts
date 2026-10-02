import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getIdentityId } from './lib/identity';
import { groupEventKindValidator } from './schema';

export const get = query({
  args: { groupId: v.id('groups') },
  returns: v.object({
    groupId: v.id('groups'),
    createdAt: v.number(),
    endedAt: v.number(),
    rows: v.array(
      v.object({
        username: v.string(),
        isYou: v.boolean(),
        setsDone: v.number(),
        durationSeconds: v.number(),
        targetsMet: v.number(),
        volumeKg: v.union(v.number(), v.null()),
      })
    ),
    timeline: v.array(
      v.object({
        kind: groupEventKindValidator,
        username: v.union(v.string(), v.null()),
        exerciseName: v.union(v.string(), v.null()),
        setNumber: v.union(v.number(), v.null()),
        at: v.number(),
      })
    ),
  }),
  handler: async (ctx, { groupId }) => {
    const userId = await getIdentityId(ctx);
    if (!userId) throw new ConvexError('NOT_FOUND');
    const ownRow = await ctx.db
      .query('groupRecapRows')
      .withIndex('by_group_user', (q) =>
        q.eq('groupId', groupId).eq('userId', userId)
      )
      .unique();
    if (!ownRow) throw new ConvexError('NOT_FOUND');
    const recap = await ctx.db.get(ownRow.recapId);
    const group = await ctx.db.get(groupId);
    if (!recap || !group) throw new ConvexError('NOT_FOUND');
    const rows = await ctx.db
      .query('groupRecapRows')
      .withIndex('by_recap', (q) => q.eq('recapId', recap._id))
      .collect();
    const usernames = new Map(rows.map((row) => [row.userId, row.username]));
    const events = await ctx.db
      .query('groupEvents')
      .withIndex('by_group_at', (q) => q.eq('groupId', groupId))
      .order('asc')
      .collect();
    return {
      groupId,
      createdAt: group.createdAt,
      endedAt: recap.endedAt,
      rows: rows
        .sort(
          (a, b) =>
            b.setsDone - a.setsDone || a.username.localeCompare(b.username)
        )
        .map((row) => ({
          username: row.username,
          isYou: row.userId === userId,
          setsDone: row.setsDone,
          durationSeconds: row.durationSeconds,
          targetsMet: row.targetsMet,
          volumeKg: row.volumeKg,
        })),
      timeline: events.map((event) => ({
        kind: event.kind,
        username: event.userId ? (usernames.get(event.userId) ?? null) : null,
        exerciseName: event.exerciseName ?? null,
        setNumber: event.setNumber ?? null,
        at: event.at,
      })),
    };
  },
});

export const forWorkout = query({
  args: { workoutId: v.id('workouts') },
  returns: v.union(v.id('groups'), v.null()),
  handler: async (ctx, { workoutId }) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const workout = await ctx.db.get(workoutId);
    if (
      !workout ||
      workout.userId !== userId ||
      workout.finishedAt === undefined
    ) {
      return null;
    }
    const finishedAt = workout.finishedAt;
    const memberships = await ctx.db
      .query('groupMemberships')
      .withIndex('by_user_left', (q) => q.eq('userId', userId))
      .collect();
    const overlapping = memberships
      .filter(
        (membership) =>
          membership.joinedAt <= finishedAt &&
          (membership.leftAt === undefined ||
            membership.leftAt >= workout.startedAt)
      )
      .sort((a, b) => b.joinedAt - a.joinedAt);
    for (const membership of overlapping) {
      const row = await ctx.db
        .query('groupRecapRows')
        .withIndex('by_group_user', (q) =>
          q.eq('groupId', membership.groupId).eq('userId', userId)
        )
        .unique();
      if (row && !row.hidden && (await ctx.db.get(row.recapId))) {
        return membership.groupId;
      }
    }
    return null;
  },
});

export const hide = mutation({
  args: { groupId: v.id('groups') },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    const userId = await getIdentityId(ctx);
    if (!userId) throw new ConvexError('NOT_FOUND');
    const row = await ctx.db
      .query('groupRecapRows')
      .withIndex('by_group_user', (q) =>
        q.eq('groupId', groupId).eq('userId', userId)
      )
      .unique();
    if (!row) throw new ConvexError('NOT_FOUND');
    await ctx.db.patch(row._id, { hidden: true });
    return null;
  },
});
