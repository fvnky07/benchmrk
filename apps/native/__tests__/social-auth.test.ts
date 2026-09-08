jest.mock('expo-constants', () => ({
  expoConfig: { extra: { googleIosSignInConfigured: true } },
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'raw-nonce') }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  isCancelledResponse: (value: unknown) =>
    Boolean(
      value &&
        typeof value === 'object' &&
        'type' in value &&
        value.type === 'cancelled'
    ),
  isSuccessResponse: (value: unknown) =>
    Boolean(
      value &&
        typeof value === 'object' &&
        'type' in value &&
        value.type === 'success'
    ),
}));
jest.mock('../lib/auth/client', () => ({
  authClient: { signIn: { social: jest.fn() }, linkSocial: jest.fn() },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Apple from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { runSocialAuth } from '@/lib/auth/social';
import { authClient } from '../lib/auth/client';

const config = {
  apple: true,
  google: { webClientId: 'web', iosClientId: 'ios' },
};
const statuses = () => {
  const values: string[] = [];
  return { values, callback: (value: string) => values.push(value) };
};

afterEach(() => jest.clearAllMocks());

test('Apple success reports loading then idle and nests user payload', async () => {
  (Apple.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: 'apple-token',
    fullName: { givenName: 'A', familyName: 'B' },
    email: 'a@example.com',
  });
  (authClient.signIn.social as jest.Mock).mockResolvedValue({ data: {} });
  const state = statuses();
  expect(await runSocialAuth('apple', config, false, state.callback)).toEqual({
    status: 'success',
  });
  expect(authClient.signIn.social).toHaveBeenCalledWith({
    provider: 'apple',
    idToken: {
      token: 'apple-token',
      nonce: 'raw-nonce',
      user: { name: { firstName: 'A', lastName: 'B' }, email: 'a@example.com' },
    },
  });
  expect(Crypto.randomUUID).toHaveBeenCalled();
  expect(state.values).toEqual(['loading', 'idle']);
});

test('Google cancellation is silent and does not exchange', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: 'cancelled' });
  const state = statuses();
  expect(await runSocialAuth('google', config, false, state.callback)).toEqual({
    status: 'cancelled',
  });
  expect(authClient.signIn.social).not.toHaveBeenCalled();
  expect(state.values).toEqual(['loading', 'idle']);
});

test('Better Auth response errors fail and link mode uses linkSocial', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: 'success',
    data: { idToken: 'token' },
  });
  (authClient.linkSocial as jest.Mock).mockResolvedValue({
    error: { code: 'ACCOUNT_NOT_LINKED' },
  });
  const state = statuses();
  const result = await runSocialAuth('google', config, true, state.callback);
  expect(result.status).toBe('failure');
  expect(result.status === 'failure' ? result.message : '').toContain(
    'original method'
  );
  expect(authClient.linkSocial).toHaveBeenCalledWith({
    provider: 'google',
    idToken: { token: 'token' },
  });
  expect(state.values).toEqual(['loading', 'idle']);
});
