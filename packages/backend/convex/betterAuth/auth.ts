import { expo } from '@better-auth/expo';
import type { GenericCtx } from '@convex-dev/better-auth';
import { createClient } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { magicLink } from 'better-auth/plugins';
import { components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import authConfig from '../auth.config';
import schema from './schema';

const siteUrl = process.env.SITE_URL;
const PREMIUM_USER_LIMIT = 100;
const LIFETIME_PREMIUM_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

// Component client with local schema for custom user
// fields (premiumUntil)
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  }
);

// NOTE: Send email via Resend HTTP API (not SDK - SDK has
// Node.js deps incompatible with Convex runtime)
// PERF: Using fetch directly avoids mailparser/stream deps
async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  console.log(`Sending magic link email to: ${to}`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'benchmrk <noreply@benchmrk.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', response.status, error);
    } else {
      // Drain the body to release the underlying connection;
      // we don't need the JSON payload on success.
      await response.text();
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

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
    // Custom user fields for premium tracking
    // premiumUntil: Unix timestamp (ms) when premium expires
    // null = not premium, far-future = lifetime premium
    user: {
      additionalFields: {
        premiumUntil: {
          type: 'number',
          required: false,
        },
      },
    },
    hooks: {
      // NOTE: Hook to grant lifetime premium after magic link
      // verification creates a session
      after: createAuthMiddleware(async (hookCtx) => {
        if (hookCtx.path !== '/magic-link/verify') {
          return;
        }

        // newSession is set by Better Auth when
        // magic link creates/authenticates a user
        const newSession = hookCtx.context.newSession;
        if (!newSession) {
          console.log('magic-link/verify hook: no newSession');
          return;
        }

        const userId = newSession.user.id;
        const adapter = hookCtx.context.adapter;

        console.log(`magic-link/verify: user ${userId}`);

        //Idempotency - check if already premium
        const existingUser = await adapter.findOne<{
          premiumUntil?: number | null;
        }>({
          model: 'user',
          where: [{ field: 'id', value: userId }],
        });

        if (
          existingUser?.premiumUntil != null &&
          existingUser.premiumUntil > Date.now()
        ) {
          console.log(`User ${userId} already premium`);
          return;
        }

        // Count current premium users by checking
        // premiumUntil > now
        const now = Date.now();
        const allUsers = await adapter.findMany<{
          premiumUntil?: number | null;
        }>({
          model: 'user',
        });

        const premiumCount = (allUsers ?? []).filter(
          (u) => u.premiumUntil != null && u.premiumUntil > now
        ).length;

        if (premiumCount < PREMIUM_USER_LIMIT) {
          const premiumUntil = Date.now() + LIFETIME_PREMIUM_MS;
          await adapter.update({
            model: 'user',
            where: [{ field: 'id', value: userId }],
            update: {
              premiumUntil,
            },
          });

          console.log(
            `Premium granted: ${userId} ` +
              `(${premiumCount + 1}/${PREMIUM_USER_LIMIT})`
          );
        } else {
          console.log(
            `Premium limit reached (${premiumCount}/${PREMIUM_USER_LIMIT})`
          );
        }
      }),
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 60 * 24,
        sendMagicLink: async ({ email, url }) => {
          console.log(`Magic link for ${email}: ${url}`);
          await sendEmailViaResend(
            email,
            'Confirm your spot - benchmrk',
            generateMagicLinkEmail(url)
          );
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

function generateMagicLinkEmail(magicLinkUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your benchmrk waitlist spot</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #171717; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="max-width: 520px; width: 100%; border-collapse: collapse;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">benchmrk</h1>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: #1f1f1f; border-radius: 16px; padding: 40px 32px;">

              <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #ffffff; text-align: center;">
                You're almost in
              </h2>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #a1a1a1; text-align: center;">
                Tap below to confirm your email and lock in your <strong style="color: #3dcde6;">lifetime premium</strong> spot.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 4px 0 28px 0;">
                    <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 36px; background-color: #3dcde6; color: #171717; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Confirm my spot
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <div style="height: 1px; background-color: #2a2a2a;"></div>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #3dcde6; text-transform: uppercase; letter-spacing: 1.5px;">
                What you'll unlock
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #d4d4d4;">
                    <span style="color: #2dd4a0; margin-right: 8px;">&#10003;</span> AI workout recommendations
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #d4d4d4;">
                    <span style="color: #2dd4a0; margin-right: 8px;">&#10003;</span> Advanced analytics &amp; insights
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #d4d4d4;">
                    <span style="color: #2dd4a0; margin-right: 8px;">&#10003;</span> Unlimited workout history
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #d4d4d4;">
                    <span style="color: #2dd4a0; margin-right: 8px;">&#10003;</span> Every future premium feature
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <p style="margin: 24px 0 0 0; font-size: 12px; color: #525252; text-align: center;">
                This link expires in 24 hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #525252;">
                &copy; ${new Date().getFullYear()} benchmrk
              </p>
              <p style="margin: 0; font-size: 11px; color: #404040;">
                AI-Powered Fitness Tracking
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
