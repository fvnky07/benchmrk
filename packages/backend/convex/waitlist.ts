import { ConvexError, v } from 'convex/values';
import { z } from 'zod';
import { components, internal } from './_generated/api';
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { createAuth } from './auth';
import { magicLinkProof } from './lib/magicLinkProof';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

/** Where a native sign-in link lands; the Expo auth plugin appends the session. */
const NATIVE_SIGN_IN_CALLBACK = 'native://magic-link';
const SIGN_IN_LINK_COOLDOWN_MS = 5 * 60 * 1000;

export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const waitlist = await ctx.db.query('waitlist').collect();
    return waitlist.length;
  },
});

// Adds an email to the waitlist and mails the confirmation link that creates
// its Waitlist identity.
export const addEmailToWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const parsed = emailSchema.safeParse(args.email);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }
    const email = parsed.data;

    const existingWaitlist = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();
    if (existingWaitlist) {
      throw new Error('Email already on waitlist');
    }

    const position = (await ctx.db.query('waitlist').collect()).length + 1;
    const waitlistId = await ctx.db.insert('waitlist', {
      email,
      position,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.waitlist.sendConfirmationLink, {
      email,
    });

    return { waitlistId, position };
  },
});

export const sendConfirmationLink = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await createAuth(ctx).api.signInMagicLink({
      body: {
        email: args.email,
        callbackURL: '/welcome',
        newUserCallbackURL: '/welcome',
        metadata: {
          flow: 'waitlist-confirmation',
          proof: await magicLinkProof(args.email, 'waitlist-confirmation'),
        },
      },
      headers: new Headers(),
    });
  },
});

/** A confirmed Waitlist identity: on the waitlist and verified through its link. */
async function isConfirmedWaitlistIdentity(ctx: QueryCtx, email: string) {
  const onWaitlist = await ctx.db
    .query('waitlist')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first();
  if (!onWaitlist) return false;
  const identity = await ctx.runQuery(
    components.betterAuth.users.getUserByEmail,
    { email }
  );
  return identity?.emailVerified === true;
}

/**
 * Requests a native sign-in link. Every valid email gets the same answer, so
 * nobody can learn who is on the waitlist; only a confirmed Waitlist identity
 * is ever mailed, at most once per cooldown. It never creates an identity.
 */
export const requestSignInLink = action({
  args: { email: v.string() },
  returns: v.object({ status: v.literal('accepted') }),
  handler: async (ctx, args) => {
    const parsed = emailSchema.safeParse(args.email);
    if (!parsed.success) throw new ConvexError('INVALID_EMAIL');
    await ctx.scheduler.runAfter(0, internal.waitlist.deliverSignInLink, {
      email: parsed.data,
    });
    return { status: 'accepted' as const };
  },
});

/** Eligibility and delivery never change the public acknowledgement. */
export const deliverSignInLink = internalAction({
  args: { email: v.string(), retry: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { email, retry }) => {
    try {
      if (await ctx.runQuery(internal.waitlist.canSendSignInLink, { email })) {
        await ctx.runAction(internal.waitlist.sendSignInLink, { email });
        await ctx.runMutation(internal.waitlist.markSignInLinkSent, { email });
      }
    } catch {
      console.error('Waitlist sign-in link delivery failed');
      if (!retry) {
        await ctx.scheduler.runAfter(
          60_000,
          internal.waitlist.deliverSignInLink,
          { email, retry: true }
        );
      }
    }
    return null;
  },
});

export const canSendSignInLink = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email }) => {
    if (!(await isConfirmedWaitlistIdentity(ctx, email))) return false;
    const previous = await ctx.db
      .query('magicLinkRequests')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    return (
      !previous || previous.lastSentAt <= Date.now() - SIGN_IN_LINK_COOLDOWN_MS
    );
  },
});

export const markSignInLinkSent = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const previous = await ctx.db
      .query('magicLinkRequests')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (previous) {
      await ctx.db.patch(previous._id, { lastSentAt: Date.now() });
    } else {
      await ctx.db.insert('magicLinkRequests', {
        email,
        lastSentAt: Date.now(),
      });
    }
  },
});

export const sendSignInLink = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await createAuth(ctx).api.signInMagicLink({
      body: {
        email: args.email,
        callbackURL: NATIVE_SIGN_IN_CALLBACK,
        newUserCallbackURL: NATIVE_SIGN_IN_CALLBACK,
        errorCallbackURL: NATIVE_SIGN_IN_CALLBACK,
        metadata: {
          flow: 'native-sign-in',
          proof: await magicLinkProof(args.email, 'native-sign-in'),
        },
      },
      headers: new Headers(),
    });
  },
});
