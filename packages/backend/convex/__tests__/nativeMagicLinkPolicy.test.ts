import { describe, expect, test } from 'vitest';
import {
  isEligibleNativeMagicLinkIdentity,
  NATIVE_MAGIC_LINK_COMPLETION,
  normalizeNativeMagicLinkEmail,
} from '../nativeMagicLinkPolicy';

describe('native magic-link completion policy', () => {
  test('normalizes syntactically valid email addresses', () => {
    expect(normalizeNativeMagicLinkEmail('  MEMBER@EXAMPLE.COM ')).toBe(
      'member@example.com'
    );
  });

  test('returns the same completion for unknown and ineligible requests', () => {
    expect(NATIVE_MAGIC_LINK_COMPLETION).toEqual({ status: 'accepted' });
    expect(NATIVE_MAGIC_LINK_COMPLETION).toEqual({ status: 'accepted' });
  });

  test.each([
    ['unknown address', null, null],
    [
      'unconfirmed waitlist identity',
      'member@example.com',
      { emailVerified: false, premiumUntil: 2_000 },
    ],
    [
      'non-premium identity',
      'member@example.com',
      { emailVerified: true, premiumUntil: null },
    ],
    [
      'waitlist-created verification session without premium',
      'member@example.com',
      { emailVerified: true },
    ],
    [
      'expired premium identity',
      'member@example.com',
      { emailVerified: true, premiumUntil: 1_000 },
    ],
  ])('%s never receives mail', (_label, waitlistEmail, user) => {
    expect(isEligibleNativeMagicLinkIdentity(waitlistEmail, user, 2_000)).toBe(
      false
    );
  });

  test('only a confirmed active-premium waitlist identity receives mail', () => {
    expect(
      isEligibleNativeMagicLinkIdentity(
        'member@example.com',
        { emailVerified: true, premiumUntil: 3_000 },
        2_000
      )
    ).toBe(true);
  });
});
