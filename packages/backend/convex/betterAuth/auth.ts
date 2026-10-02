import { expo } from '@better-auth/expo';
import type { GenericCtx } from '@convex-dev/better-auth';
import { createClient } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { magicLink, twoFactor } from 'better-auth/plugins';
import { components, internal } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import authConfig from '../auth.config';
import { revokeAppleAuthorization } from '../lib/appleRevocation';
import { actionEmail, sendEmail } from '../lib/email';
import { authorizedMagicLinkFlow } from '../lib/magicLinkProof';
import schema from './schema';

const siteUrl = process.env.SITE_URL;

/** Where verification and reset links land in the app; the Expo plugin appends the session. */
const EMAIL_VERIFIED_CALLBACK = 'native://email-verified';
const PASSWORD_RESET_CALLBACK = 'native://reset-password';
const PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60;
/** How recently a member must have signed in to delete without a password. */
const FRESH_SESSION_SECONDS = 10 * 60;
/** Header carrying a fresh Sign in with Apple authorization code on deletion. */
export const APPLE_AUTHORIZATION_CODE_HEADER = 'x-apple-authorization-code';
export const DELETION_IDENTITY_HEADER = 'x-deletion-identity-id';

/** An emailed link that always returns to the app, whatever the client asked. */
function withNativeCallback(url: string, callback: string): string {
  const link = new URL(url);
  link.searchParams.set('callbackURL', callback);
  return link.toString();
}

/** HTTP auth routes return a retryable, stable code rather than a raw Convex error. */
async function sendAuthEmail(email: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await sendEmail(email);
  } catch {
    throw new APIError('BAD_GATEWAY', {
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'We couldn’t send the email. Try again.',
    });
  }
}

// Component client with the local schema (username, bio, two-factor fields).
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  }
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: 'benchmrk',
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      'https://benchmrk.app',
      'http://localhost:3000',
      'native://',
      'https://appleid.apple.com',
      // TODO: apparently dont use the following in prod:
      ...(process.env.NODE_ENV === 'development'
        ? [
            'exp://', // Trust all Expo URLs (prefix matching)
            'exp://**', // Trust all Expo URLs (wildcard matching)
            'exp://192.168.*.*:*/**', // Trust 192.168.x.x IP range with any port and path
          ]
        : []),
    ],
    session: { freshAge: FRESH_SESSION_SECONDS },
    user: {
      // Re-authentication must still refer to the originally selected identity.
      // Revoke authentication immediately, then purge app data in scheduled batches.
      deleteUser: {
        enabled: true,
        beforeDelete: async (user, request) => {
          if (!('runMutation' in ctx)) {
            throw new APIError('INTERNAL_SERVER_ERROR');
          }
          if (request?.headers.get(DELETION_IDENTITY_HEADER) !== user.id) {
            throw new APIError('BAD_REQUEST', {
              code: 'DELETION_IDENTITY_CHANGED',
              message: 'The identity changed. Nothing was deleted.',
            });
          }
          const usesApple = await ctx.runQuery(
            components.betterAuth.identity.hasAppleAccount,
            { userId: user.id }
          );
          if (usesApple) {
            const code = request?.headers.get(APPLE_AUTHORIZATION_CODE_HEADER);
            if (!code) {
              throw new APIError('BAD_REQUEST', {
                code: 'APPLE_REAUTHENTICATION_REQUIRED',
                message: 'Confirm with Apple to delete your Benchmrk identity.',
              });
            }
            try {
              await revokeAppleAuthorization(code);
            } catch {
              throw new APIError('BAD_REQUEST', {
                code: 'APPLE_REVOCATION_FAILED',
                message: 'Apple didn’t confirm. Nothing was deleted.',
              });
            }
          }
          await ctx.runMutation(internal.accountDeletion.deleteIdentity, {
            userId: user.id,
            email: user.email,
          });
        },
      },
    },
    // Members can log Workouts before verifying; Groups and password recovery
    // check verification themselves.
    emailAndPassword: {
      requireEmailVerification: false,
      enabled: true,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      // Every request gets the same answer; only verified emails get mail.
      sendResetPassword: async ({ user, url }) => {
        if (!user.emailVerified) return;
        await sendAuthEmail({
          to: user.email,
          subject: 'Reset your password - benchmrk',
          html: actionEmail({
            title: 'Reset your benchmrk password',
            heading: 'Reset your password',
            body: 'Open this link on the phone where benchmrk is installed to choose a new password. Every device will be signed out.',
            actionLabel: 'Choose a new password',
            url: withNativeCallback(url, PASSWORD_RESET_CALLBACK),
            footnote:
              'This link expires in 1 hour and works once. If you didn’t ask for it, ignore this email; your password stays the same.',
          }),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Verify your email - benchmrk',
          html: actionEmail({
            title: 'Verify your benchmrk email',
            heading: 'Verify your email',
            body: 'Confirm this address to create Groups, join them and recover your password. Open the link on the phone where benchmrk is installed.',
            actionLabel: 'Verify email',
            url: withNativeCallback(url, EMAIL_VERIFIED_CALLBACK),
            footnote:
              'If you didn’t create a Benchmrk identity, ignore this email.',
          }),
        });
      },
    },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_CLIENT_SECRET &&
      process.env.APPLE_APP_BUNDLE_IDENTIFIER
        ? {
            apple: {
              clientId: process.env.APPLE_CLIENT_ID,
              clientSecret: process.env.APPLE_CLIENT_SECRET,
              appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
            },
          }
        : {}),
    },
    account: {
      // ADR 0001: providers attach only through explicit linking, and the last
      // remaining sign-in method can never be unlinked.
      accountLinking: {
        disableImplicitLinking: true,
        allowDifferentEmails: true,
        updateUserInfoOnLink: false,
        allowUnlinkingAll: false,
      },
    },
    hooks: {
      // A password change always signs out every other session; this device
      // gets a fresh one. Enforced here rather than trusted from the client.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/change-password') return;
        return {
          context: { body: { ...ctx.body, revokeOtherSessions: true } },
        };
      }),
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 60 * 24,
        sendMagicLink: async ({ email, url, metadata }) => {
          const flow = await authorizedMagicLinkFlow(email, metadata);
          if (flow === 'waitlist-confirmation') {
            await sendAuthEmail({
              to: email,
              subject: 'Confirm your spot - benchmrk',
              html: actionEmail({
                title: 'Confirm your benchmrk waitlist spot',
      {
        id: 'await-auth-delivery',
        // Better Auth otherwise catches even awaited registration/reset email
        // failures. Delivery is part of these requests, not background work.
        init: () => ({
          context: {
            runInBackgroundOrAwait: async (promise: unknown) => {
              await promise;
            },
          },
        }),
      },
                heading: 'You’re almost in',
                body: 'Confirm your email to join the benchmrk waitlist. Benchmrk is free and open source.',
                actionLabel: 'Confirm my spot',
                url,
                footnote: 'This link expires in 24 hours.',
              }),
            });
          } else if (flow === 'native-sign-in') {
            await sendAuthEmail({
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
          }
        },
      }),
      // TOTP authenticator apps and backup codes; no email OTP factor.
      // Enrolling needs the password and a first valid code.
      twoFactor({
        issuer: 'benchmrk',
        skipVerificationOnEnable: false,
        backupCodeOptions: { amount: 10 },
      }),
      expo(),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
};

// NOTE: Export for @better-auth/cli schema generation
// Usage: npx @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts
export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
