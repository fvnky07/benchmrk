import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { authClient } from './client';

export type SocialProvider = 'apple' | 'google';
export type SocialAuthConfig = {
  apple: boolean;
  google: { webClientId: string; iosClientId: string | null } | null;
};
export type SocialResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'failure'; message: string };
type StatusCallback = (status: 'loading' | 'idle') => void;

export function isAppleAvailable(
  config: SocialAuthConfig | undefined,
  nativeAvailable: boolean
) {
  return Platform.OS === 'ios' && Boolean(config?.apple && nativeAvailable);
}

export function isGoogleAvailable(config: SocialAuthConfig | undefined) {
  if (!config?.google) return false;
  return (
    Platform.OS === 'android' ||
    Boolean(
      config.google.iosClientId &&
        Constants.expoConfig?.extra?.googleIosSignInConfigured
    )
  );
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if (
    'body' in error &&
    error.body &&
    typeof error.body === 'object' &&
    'code' in error.body &&
    typeof error.body.code === 'string'
  )
    return error.body.code;
  return undefined;
}

function errorMessage(error: unknown) {
  const code = readErrorCode(error)?.toLowerCase();
  if (code === 'account_not_linked')
    return 'An existing identity uses this email. Sign in with the original method, then link this provider in Manage Account.';
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Could not complete authentication. Please try again.';
}

async function exchange(
  provider: SocialProvider,
  payload: Record<string, unknown>,
  linking: boolean
) {
  const operation = linking ? authClient.linkSocial : authClient.signIn.social;
  try {
    const response = await (
      operation as (
        input: unknown
      ) => Promise<{ data?: unknown; error?: unknown }>
    )({ provider, ...payload });
    if (response.error)
      return {
        status: 'failure',
        message: errorMessage(response.error),
      } as const;
    return { status: 'success' } as const;
  } catch (error) {
    return { status: 'failure', message: errorMessage(error) } as const;
  }
}

export async function runSocialAuth(
  provider: SocialProvider,
  config: SocialAuthConfig,
  linking = false,
  onStatus?: StatusCallback
): Promise<SocialResult> {
  const configured =
    provider === 'apple' ? config.apple : config.google !== null;
  if (!configured) {
    return {
      status: 'failure',
      message: `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is not configured.`,
    };
  }
  onStatus?.('loading');
  try {
    if (provider === 'apple') {
      try {
        const nonce = Crypto.randomUUID();
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce,
        });
        if (!credential.identityToken)
          return {
            status: 'failure',
            message:
              'Apple did not return an identity token. Please try again.',
          };
        const user = linking
          ? undefined
          : {
              name: {
                firstName: credential.fullName?.givenName,
                lastName: credential.fullName?.familyName,
              },
              email: credential.email,
            };
        return await exchange(
          'apple',
          {
            idToken: {
              token: credential.identityToken,
              nonce,
              ...(user ? { user } : {}),
            },
          },
          linking
        );
      } catch (error) {
        if (readErrorCode(error)?.toLowerCase() === 'err_request_canceled')
          return { status: 'cancelled' };
        return { status: 'failure', message: errorMessage(error) };
      }
    }

    try {
      if (Platform.OS === 'android')
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      GoogleSignin.configure({
        webClientId: config.google?.webClientId,
        iosClientId: config.google?.iosClientId ?? undefined,
      });
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return { status: 'cancelled' };
      if (!isSuccessResponse(response) || !response.data.idToken)
        return {
          status: 'failure',
          message: 'Google did not return an identity token. Please try again.',
        };
      return await exchange(
        'google',
        { idToken: { token: response.data.idToken } },
        linking
      );
    } catch (error) {
      if (
        readErrorCode(error)?.toLowerCase() === 'sign_in_cancelled' ||
        readErrorCode(error)?.toLowerCase() === 'canceled'
      )
        return { status: 'cancelled' };
      return { status: 'failure', message: errorMessage(error) };
    }
  } finally {
    onStatus?.('idle');
  }
}
