export { authClient, storeLinkedSession } from './client';
export { type UseAuthReturn, type User, useAuth } from './hooks';
export {
  isAppleAvailable,
  isGoogleAvailable,
  reauthenticateWithApple,
  runSocialAuth,
  type SocialAuthConfig,
  type SocialProvider,
  type SocialResult,
} from './social';
export * from './store';
