// Identity-wide operations inside the Better Auth component. The app calls
// these with an identity it has already authenticated; `ctx.auth` isn't
// available inside components.
import { v } from 'convex/values';
import type { Id, TableNames } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

/** Whether the identity signs in with Apple (its tokens need revoking on deletion). */
export const hasAppleAccount = query({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query('account')
      .withIndex('userId', (q) => q.eq('userId', args.userId))
      .collect();
    return accounts.some((account) => account.providerId === 'apple');
  },
});

const PER_USER_TABLES = [
  'session',
  'account',
  'twoFactor',
  'passkey',
] as const satisfies TableNames[];

/**
 * Removes the identity and everything the component keeps for it: sessions,
 * sign-in methods, two-factor secrets, passkeys and the uploaded profile
 * photo. Runs inside the app's deletion transaction.
 */
export const deleteIdentity = mutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const table of PER_USER_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex('userId', (q) => q.eq('userId', args.userId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    const user = await ctx.db.get(args.userId as Id<'user'>);
    if (!user) return null;
    if (user.imageStorageId) {
      await ctx.storage.delete(user.imageStorageId as Id<'_storage'>);
    }
    await ctx.db.delete(user._id);
    return null;
  },
});
