// NOTE: User queries for the Better Auth component (local install)

import { v } from 'convex/values';
import { query } from './_generated/server';

// NOTE: Get a user by their Better Auth user id
export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('user')
      .filter((q) => q.eq(q.field('_id'), args.userId))
      .first();
  },
});

// NOTE: Check if a user exists by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('user')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first();
  },
});

// NOTE: Find a user by exact (lowercased) username; Group invites never search
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('user')
      .withIndex('username', (q) => q.eq('username', args.username))
      .first();
  },
});
