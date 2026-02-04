import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

export const addEmailToWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Validate and normalize email with Zod
    const parsed = emailSchema.safeParse(args.email);

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }

    const email = parsed.data;

    // Check if email already exists (using normalized lowercase email)
    const existing = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (existing) {
      throw new Error('Email already on waitlist');
    }

    // Insert normalized email
    return await ctx.db.insert('waitlist', { email });
  },
});
