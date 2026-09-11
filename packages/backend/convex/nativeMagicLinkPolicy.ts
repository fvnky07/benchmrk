import { z } from 'zod';

export const nativeMagicLinkEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

export const NATIVE_MAGIC_LINK_COMPLETION = {
  status: 'accepted',
} as const;

type WaitlistIdentity = {
  emailVerified: boolean;
  premiumUntil?: number | null;
} | null;

export function normalizeNativeMagicLinkEmail(email: string): string | null {
  const parsed = nativeMagicLinkEmailSchema.safeParse(email);
  return parsed.success ? parsed.data : null;
}

export function isEligibleNativeMagicLinkIdentity(
  waitlistEmail: string | null,
  user: WaitlistIdentity,
  now = Date.now()
): boolean {
  return (
    Boolean(waitlistEmail) &&
    user?.emailVerified === true &&
    user.premiumUntil != null &&
    user.premiumUntil > now
  );
}
