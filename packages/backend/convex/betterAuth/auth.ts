import { expo } from '@better-auth/expo';
import type { GenericCtx } from '@convex-dev/better-auth';
import { createClient } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import authConfig from '../auth.config';
import { actionEmail, sendEmail } from '../lib/email';
import { authorizedMagicLinkFlow } from '../lib/magicLinkProof';
import schema from './schema';

const siteUrl = process.env.SITE_URL;

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
    emailAndPassword: {
      requireEmailVerification: false,
      enabled: true,
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
      accountLinking: {
        disableImplicitLinking: true,
        allowDifferentEmails: true,
        updateUserInfoOnLink: false,
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 60 * 24,
        sendMagicLink: async ({ email, url, metadata }) => {
          const flow = await authorizedMagicLinkFlow(email, metadata);
          if (flow === 'waitlist-confirmation') {
            await sendEmail({
              to: email,
              subject: 'Confirm your spot - benchmrk',
              html: actionEmail({
                title: 'Confirm your benchmrk waitlist spot',
                heading: 'You’re almost in',
                body: 'Confirm your email to join the benchmrk waitlist. Benchmrk is free and open source.',
                actionLabel: 'Confirm my spot',
                url,
                footnote: 'This link expires in 24 hours.',
              }),
            });
          } else if (flow === 'native-sign-in') {
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
          }
        },
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
