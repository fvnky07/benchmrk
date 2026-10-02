import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { DROPPED_AFTER_MS, IDLE_END_AFTER_MS } from './domain/presence';
import { endGroup, groupMembers, leaveGroup } from './lib/groupProgress';

export const sweep = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const groups = await ctx.db
      .query('groups')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .paginate({ numItems: 50, cursor: args.cursor ?? null });

    for (const group of groups.page) {
      if (now - group.lastActivityAt >= IDLE_END_AFTER_MS) {
        await endGroup(ctx, group);
        continue;
      }
      for (const member of await groupMembers(ctx, group)) {
        if (now - (member.lastSeenAt ?? member.joinedAt) >= DROPPED_AFTER_MS) {
          await leaveGroup(ctx, member.userId, 'dropped');
        }
      }
    }

    if (!groups.isDone) {
      await ctx.scheduler.runAfter(0, internal.groupSweeps.sweep, {
        cursor: groups.continueCursor,
      });
    }
    return null;
  },
});
