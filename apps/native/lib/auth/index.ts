export { authClient } from './client';
export { type UseAuthReturn, type User, useAuth } from './hooks';
export {
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialAuthConfig,
  type SocialProvider,
  type SocialResult,
} from './social';
export * from './store';
