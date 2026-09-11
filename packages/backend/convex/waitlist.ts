import { v } from 'convex/values';
import { z } from 'zod';
import { components, internal } from './_generated/api';
import {
  internalAction,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { createAuth } from './auth';
import { createMagicLinkProof } from './betterAuth/auth';
import {
  isEligibleNativeMagicLinkIdentity,
  NATIVE_MAGIC_LINK_COMPLETION,
  normalizeNativeMagicLinkEmail,
} from './nativeMagicLinkPolicy';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

const MAX_PREMIUM_SPOTS = 100;
const NATIVE_MAGIC_LINK_COOLDOWN_MS = 5 * 60 * 1000;

// NOTE: Query to get the count of confirmed premium users
export const getPremiumStats = query({
  args: {},
  handler: async (ctx) => {
    // NOTE: Query Better Auth user table via component to count premium users
    // The authComponent provides access to the Better Auth tables
    const premiumCount = await ctx.runQuery(
      components.betterAuth.users.countPremiumUsers,
      {}
    );

    return {
      claimed: premiumCount,
      remaining: Math.max(0, MAX_PREMIUM_SPOTS - premiumCount),
      total: MAX_PREMIUM_SPOTS,
    };
  },
});

// NOTE: Query to get waitlist count for position tracking
export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const waitlist = await ctx.db.query('waitlist').collect();
    return waitlist.length;
  },
});

// NOTE: Add email to waitlist and trigger magic link email
export const addEmailToWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Validate and normalize email with Zod
    const parsed = emailSchema.safeParse(args.email);

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }

    const email = parsed.data;

    // Check if email already exists in waitlist
    const existingWaitlist = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (existingWaitlist) {
      throw new Error('Email already on waitlist');
    }

    // Get current waitlist count for position
    const currentCount = await ctx.db.query('waitlist').collect();
    const position = currentCount.length + 1;

    // Insert to waitlist with position and timestamp
    const waitlistId = await ctx.db.insert('waitlist', {
      email,
      position,
      createdAt: Date.now(),
    });

    // Schedule magic link email send
    await ctx.scheduler.runAfter(0, internal.waitlist.sendMagicLinkEmail, {
      email,
    });

    return { waitlistId, position };
  },
});

export const isEligibleNativeMagicLink = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const waitlistEntry = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
    const user = await ctx.runQuery(
      components.betterAuth.users.getUserByEmail,
      { email: args.email }
    );
    return isEligibleNativeMagicLinkIdentity(
      waitlistEntry?.email ?? null,
      user,
      Date.now()
    );
  },
});

// All syntactically valid requests complete identically. Only eligible users
// reach the internal action that asks Better Auth to create a mail token.
export const requestNativeMagicLink = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeNativeMagicLinkEmail(args.email);
    if (email === null) {
      throw new Error('Invalid email address');
    }

    try {
      const eligible = await ctx.runQuery(
        internal.waitlist.isEligibleNativeMagicLink,
        { email }
      );
      if (eligible) {
        const now = Date.now();
        const existingRequest = await ctx.db
          .query('native_magic_link_requests')
          .withIndex('by_email', (q) => q.eq('email', email))
          .first();
        if (
          existingRequest &&
          existingRequest.lastSentAt > now - NATIVE_MAGIC_LINK_COOLDOWN_MS
        ) {
          return NATIVE_MAGIC_LINK_COMPLETION;
        }
        if (existingRequest) {
          await ctx.db.patch(existingRequest._id, { lastSentAt: now });
        } else {
          await ctx.db.insert('native_magic_link_requests', {
            email,
            lastSentAt: now,
          });
        }
        await ctx.scheduler.runAfter(
          0,
          internal.waitlist.sendNativeMagicLinkEmail,
          { email }
        );
      }
    } catch {
      console.error('Native magic-link request could not be processed');
    }

    return NATIVE_MAGIC_LINK_COMPLETION;
  },
});

// Actions are private so arbitrary callers cannot use Better Auth's default
// magic-link behavior to create identities outside the waitlist flow.
export const sendMagicLinkEmail = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);

    // NOTE: This triggers Better Auth's magic link flow
    // which will call our sendMagicLink callback with Resend
    // The headers are empty since this is server-side initiated
    await auth.api.signInMagicLink({
      body: {
        email: args.email,
        // NOTE: Redirect to welcome page after confirmation
        callbackURL: '/welcome',
        // NOTE: New users also go to welcome page
        newUserCallbackURL: '/welcome',
        metadata: {
          flow: 'waitlist-enrollment',
          proof: await createMagicLinkProof(args.email, 'waitlist-enrollment'),
        },
      },
      headers: new Headers(),
    });
  },
});

export const sendNativeMagicLinkEmail = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    try {
      const auth = createAuth(ctx);
      await auth.api.signInMagicLink({
        body: {
          email: args.email,
          callbackURL: 'native://',
          newUserCallbackURL: 'native://',
          errorCallbackURL: 'native://',
          metadata: {
            flow: 'native-login',
            proof: await createMagicLinkProof(args.email, 'native-login'),
          },
        },
        headers: new Headers(),
      });
    } catch {
      console.error('Native magic-link delivery failed');
    }
  },
});
