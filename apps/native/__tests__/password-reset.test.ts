import { completePasswordReset } from '../lib/auth/password-reset';

test('a successful password reset remains successful when sign-out fails', async () => {
  await expect(
    completePasswordReset(
      async () => ({ error: null }),
      async () => {
        throw new Error('Offline');
      }
    )
  ).resolves.toBe(true);
});

test('a refused reset remains unsuccessful and does not sign out', async () => {
  const signOut = jest.fn(async () => undefined);
  expect(
    await completePasswordReset(
      async () => ({ error: 'TOKEN_EXPIRED' }),
      signOut
    )
  ).toBe(false);
  expect(signOut).not.toHaveBeenCalled();
});
