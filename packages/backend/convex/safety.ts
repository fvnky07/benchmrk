import { ConvexError, v } from 'convex/values';

import { components } from './_generated/api';
import { mutation, query } from './_generated/server';
import { activeMembership, requireMembership } from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';

export const block = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const profile = await ctx.runQuery(
      components.betterAuth.users.getUserByUsername,
      { username: args.username.trim().toLowerCase() }
    );
    if (!profile) throw new ConvexError('NO_SUCH_USERNAME');
    if (profile._id === userId) throw new ConvexError('CANNOT_BLOCK_SELF');
    const existing = await ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) =>
        q.eq('blockerId', userId).eq('blockedId', profile._id)
      )
      .first();
    if (!existing) {
      await ctx.db.insert('blocks', {
        blockerId: userId,
        blockedId: profile._id,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const unblock = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const profile = await ctx.runQuery(
      components.betterAuth.users.getUserByUsername,
      { username: args.username.trim().toLowerCase() }
    );
    if (!profile) throw new ConvexError('NO_SUCH_USERNAME');
    if (profile._id === userId) throw new ConvexError('CANNOT_BLOCK_SELF');
    const blocks = await ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) =>
        q.eq('blockerId', userId).eq('blockedId', profile._id)
      )
      .collect();
    for (const blocked of blocks) await ctx.db.delete(blocked._id);
    return null;
  },
});

export const blocked = query({
  args: {},
  returns: v.array(v.object({ username: v.string(), blockedAt: v.number() })),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return [];
    const blocks = await ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect();
    blocks.sort((a, b) => b.createdAt - a.createdAt);
    const entries: { username: string; blockedAt: number }[] = [];
    for (const block of blocks) {
      const profile = await ctx.runQuery(components.betterAuth.users.getUser, {
        userId: block.blockedId,
      });
      if (profile?.username) {
        entries.push({
          username: profile.username,
          blockedAt: block.createdAt,
        });
      }
    }
    return entries;
  },
});

export const report = mutation({
  args: {
    username: v.string(),
    reason: v.union(
      v.literal('harassment'),
      v.literal('spam'),
      v.literal('inappropriate_profile'),
      v.literal('cheating'),
      v.literal('other')
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    const profile = await ctx.runQuery(
      components.betterAuth.users.getUserByUsername,
      { username: args.username.trim().toLowerCase() }
    );
    if (!profile) throw new ConvexError('MEMBER_NOT_FOUND');
    if (profile._id === userId) throw new ConvexError('CANNOT_REPORT_SELF');
    const reportedMembership = await activeMembership(ctx, profile._id);
    if (reportedMembership?.groupId !== group._id) {
      throw new ConvexError('MEMBER_NOT_FOUND');
    }
    await ctx.db.insert('reports', {
      reporterId: userId,
      reportedId: profile._id,
      groupId: group._id,
      reason: args.reason,
      createdAt: Date.now(),
    });
    return null;
  },
});
