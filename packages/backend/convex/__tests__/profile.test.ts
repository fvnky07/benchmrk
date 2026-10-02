import { describe, expect, test } from 'vitest';

import { api } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
} from './harness.testing';

async function member(t: TestBackend, email: string) {
  const identityId = await createAuthIdentity(t, {
    email,
    emailVerified: true,
    name: 'Pat Lifter',
  });
  return t.withIdentity({ subject: identityId });
}

describe('profile editing', () => {
  test('a member changes username and bio; usernames are stored lowercase', async () => {
    const t = createTest();
    const pat = await member(t, 'pat@example.com');

    await pat.mutation(api.profile.updateProfile, {
      username: 'Pat_Lifts',
      bio: 'Squats on Mondays',
    });

    expect(await pat.query(api.profile.getCurrentProfile, {})).toMatchObject({
      username: 'pat_lifts',
      bio: 'Squats on Mondays',
      email: 'pat@example.com',
    });
  });

  test('your own username stays available to you while editing, not to others', async () => {
    const t = createTest();
    const pat = await member(t, 'pat@example.com');
    const sam = await member(t, 'sam@example.com');
    await pat.mutation(api.profile.updateProfile, { username: 'pat_lifts' });

    expect(
      await pat.query(api.profile.checkUsername, { username: 'pat_lifts' })
    ).toBe(true);
    expect(
      await sam.query(api.profile.checkUsername, { username: 'PAT_LIFTS' })
    ).toBe(false);
  });

  test('a username someone else holds is refused, whatever its case', async () => {
    const t = createTest();
    const pat = await member(t, 'pat@example.com');
    const sam = await member(t, 'sam@example.com');
    await pat.mutation(api.profile.updateProfile, { username: 'pat_lifts' });

    await expect(
      sam.mutation(api.profile.updateProfile, { username: 'Pat_Lifts' })
    ).rejects.toThrow('USERNAME_TAKEN');
  });

  test('usernames need 3–20 letters, numbers or underscores and bios at most 150 characters', async () => {
    const t = createTest();
    const pat = await member(t, 'pat@example.com');

    for (const username of ['ab', 'has space', 'a'.repeat(21), 'émile']) {
      await expect(
        pat.mutation(api.profile.updateProfile, { username })
      ).rejects.toThrow('INVALID_USERNAME');
    }
    await expect(
      pat.mutation(api.profile.updateProfile, { bio: 'x'.repeat(151) })
    ).rejects.toThrow('BIO_TOO_LONG');
  });

  test('a signed-out caller can’t change a profile', async () => {
    const t = createTest();

    await expect(
      t.mutation(api.profile.updateProfile, { bio: 'hello' })
    ).rejects.toThrow('NOT_AUTHENTICATED');
  });
});
