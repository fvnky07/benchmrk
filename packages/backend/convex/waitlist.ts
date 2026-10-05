import { ConvexError, v } from 'convex/values';
import { z } from 'zod';
import { components, internal } from './_generated/api';
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { createAuth } from './auth';
import { actionEmail, sendEmail } from './lib/email';
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
      await ctx.runMutation(internal.waitlist.reserveSignInLink, {
        email,
        retry: retry ?? false,
      });
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

/** Cooldown, auth token and delivery job commit together before any email. */
export const reserveSignInLink = internalMutation({
  args: { email: v.string(), retry: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { email, retry }) => {
    if (!(await isConfirmedWaitlistIdentity(ctx, email))) return null;
    const previous = await ctx.db
      .query('magicLinkRequests')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    const now = Date.now();
    if (previous && now - previous.lastSentAt < SIGN_IN_LINK_COOLDOWN_MS) {
      return null;
    }
    if (previous) {
      await ctx.db.patch(previous._id, { lastSentAt: now, token: undefined });
    } else {
      await ctx.db.insert('magicLinkRequests', { email, lastSentAt: now });
    }
    await createAuth(ctx).api.signInMagicLink({
      body: {
        email,
        callbackURL: NATIVE_SIGN_IN_CALLBACK,
        newUserCallbackURL: NATIVE_SIGN_IN_CALLBACK,
        errorCallbackURL: NATIVE_SIGN_IN_CALLBACK,
        metadata: {
          flow: 'native-sign-in',
          proof: await magicLinkProof(email, 'native-sign-in'),
          retry,
        },
      },
      headers: new Headers(),
    });
    return null;
  },
});

const deliveryArgs = {
  email: v.string(),
  token: v.string(),
  url: v.string(),
  retry: v.boolean(),
};

/** Called by Better Auth inside reserveSignInLink's transaction. */
export const queueReservedSignInLink = internalMutation({
  args: deliveryArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query('magicLinkRequests')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
    if (!reservation || reservation.token !== undefined) {
      throw new ConvexError('SIGN_IN_LINK_NOT_RESERVED');
    }
    await ctx.db.patch(reservation._id, { token: args.token });
    await ctx.scheduler.runAfter(0, internal.waitlist.sendSignInLink, args);
    return null;
  },
});

export const releaseSignInLink = internalMutation({
  args: { email: v.string(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, token }) => {
    const reservation = await ctx.db
      .query('magicLinkRequests')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (reservation?.token === token) {
      await ctx.db.delete(reservation._id);
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: 'verification',
          where: [{ field: 'identifier', value: token }],
        },
      });
    }
    return null;
  },
});

export const sendSignInLink = internalAction({
  args: deliveryArgs,
  returns: v.null(),
  handler: async (ctx, { email, token, url, retry }) => {
    try {
      await sendEmail({
        to: email,
        subject: 'Your benchmrk sign-in link',
        html: actionEmail({
          title: 'Sign in to benchmrk',
          heading: 'Sign in to benchmrk',
          body: 'Open this link on the phone where benchmrk is installed to sign in.',
          actionLabel: 'Sign in',
          url,
          footnote:
            'This link expires in 24 hours. If you didn’t ask for it, ignore this email.',
        }),
      });
    } catch {
      console.error('Waitlist sign-in link delivery failed');
      await ctx.runMutation(internal.waitlist.releaseSignInLink, {
        email,
        token,
      });
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
