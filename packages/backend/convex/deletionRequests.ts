// Deletion requests from the public website page Google Play requires. A
// request is recorded only once the requester confirms the emailed link; the
// maintainer is then notified and processes it by hand.
import { ConvexError, v } from 'convex/values';
import { z } from 'zod';
import { internal } from './_generated/api';
import {
  action,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from './_generated/server';
import { actionEmail, escapeHtml, sendEmail } from './lib/email';
import { randomToken, sha256Hex } from './lib/webCrypto';

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
/** The processing timeline the website page promises. */
export const DELETION_PROCESSING_DAYS = 30;

const emailSchema = z.string().trim().toLowerCase().email();

async function findByEmail(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query('deletionRequests')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first();
}

/**
 * Mails a confirmation link. Every valid email gets the same answer, whether
 * or not it belongs to a Benchmrk identity or already has a request.
 */
export const request = action({
  args: { email: v.string() },
  returns: v.object({ status: v.literal('accepted') }),
  handler: async (ctx, args) => {
    const parsed = emailSchema.safeParse(args.email);
    if (!parsed.success) throw new ConvexError('INVALID_EMAIL');
    const email = parsed.data;
    const token = randomToken();

    const shouldMail = await ctx.runQuery(
      internal.deletionRequests.canIssueLink,
      { email }
    );
    if (shouldMail) {
      const siteUrl = process.env.SITE_URL ?? 'https://benchmrk.app';
      await sendEmail({
        to: email,
        subject: 'Confirm your Benchmrk deletion request',
        html: actionEmail({
          title: 'Confirm your deletion request',
          heading: 'Confirm your deletion request',
          body: `Someone asked to delete the Benchmrk identity for this email. Confirm to send the request; we process it within ${DELETION_PROCESSING_DAYS} days.`,
          actionLabel: 'Confirm deletion request',
          url: `${siteUrl}/delete-account/confirm?token=${token}`,
          footnote:
            'This link expires in 24 hours. If you didn’t ask for this, ignore this email and nothing happens.',
        }),
      });
      await ctx.runMutation(internal.deletionRequests.issueLink, {
        email,
        tokenHash: await sha256Hex(token),
      });
    }
    return { status: 'accepted' as const };
  },
});

export const canIssueLink = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email }) => {
    const existing = await findByEmail(ctx, email);
    return (
      existing?.confirmedAt === undefined &&
      (!existing || Date.now() - existing.linkSentAt >= RESEND_COOLDOWN_MS)
    );
  },
});

/** Stores a fresh link unless the request is confirmed or a link just went out. */
export const issueLink = internalMutation({
  args: { email: v.string(), tokenHash: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await findByEmail(ctx, args.email);
    if (existing?.confirmedAt !== undefined) return false;
    if (existing && now - existing.linkSentAt < RESEND_COOLDOWN_MS) {
      return false;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        tokenHash: args.tokenHash,
        linkSentAt: now,
      });
    } else {
      await ctx.db.insert('deletionRequests', {
        email: args.email,
        tokenHash: args.tokenHash,
        linkSentAt: now,
      });
    }
    return true;
  },
});

/** Confirms a request from its emailed link; confirming again changes nothing. */
export const confirm = action({
  args: { token: v.string() },
  returns: v.object({ status: v.literal('confirmed') }),
  handler: async (ctx, args) => {
    const confirmation = await ctx.runMutation(
      internal.deletionRequests.markConfirmed,
      { tokenHash: await sha256Hex(args.token) }
    );
    if (confirmation === 'invalid') {
      throw new ConvexError('INVALID_DELETION_LINK');
    }
    if (confirmation.needsNotification) {
      const maintainer = process.env.DELETION_REQUEST_NOTIFY_EMAIL;
      if (!maintainer) throw new ConvexError('EMAIL_DELIVERY_FAILED');
      await sendEmail({
        to: maintainer,
        subject: 'New Benchmrk deletion request',
        html: `<p>A deletion request for <strong>${escapeHtml(confirmation.email)}</strong> was confirmed on ${new Date(confirmation.confirmedAt).toISOString()}.</p><p>Delete the identity and its data within ${DELETION_PROCESSING_DAYS} days.</p>`,
      });
      await ctx.runMutation(internal.deletionRequests.markNotified, {
        tokenHash: await sha256Hex(args.token),
      });
    }
    return { status: 'confirmed' as const };
  },
});

export const markConfirmed = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const pending = await ctx.db
      .query('deletionRequests')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique();
    if (!pending) return 'invalid' as const;
    if (pending.confirmedAt !== undefined) {
      return {
        needsNotification: pending.notifiedAt === undefined,
        email: pending.email,
        confirmedAt: pending.confirmedAt,
      };
    }
    if (now - pending.linkSentAt > LINK_LIFETIME_MS) return 'invalid' as const;

    await ctx.db.patch(pending._id, { confirmedAt: now });
    return { needsNotification: true, email: pending.email, confirmedAt: now };
  },
});

export const markNotified = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const request = await ctx.db
      .query('deletionRequests')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
      .unique();
    if (request && request.notifiedAt === undefined) {
      await ctx.db.patch(request._id, { notifiedAt: Date.now() });
    }
  },
});
