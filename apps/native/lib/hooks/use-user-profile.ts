import { type User, useAuth } from '../auth';

export interface ExtendedUser extends User {
  displayUsername?: string;
  username?: string;
  bio?: string;
}

export interface UserProfile {
  /** The authenticated user object from Better Auth */
  user: User | undefined;
  /** Display username (priority: displayUsername > username > name > "User") */
  username: string;
  /** User bio or null */
  bio: string | null;
  /** User avatar URL or null */
  avatarUrl: string | null;
  /** Two-letter initials from username */
  initials: string;
  /** Loading state from session */
  isLoading: boolean;
}

/**
 * Hook to get user profile data with safe fallbacks
 *
 * Consumes useAuth() to avoid duplicate session subscriptions.
 *
 * @example
 * ```tsx
 * const { username, bio, avatarUrl, initials, isLoading } = useUserProfile();
 * ```
 */
export function useUserProfile(): UserProfile {
  const { user, isLoading } = useAuth();

  const userData = user as ExtendedUser | undefined;

  const username =
    userData?.displayUsername ?? userData?.username ?? user?.name ?? 'User';

  const bio = userData?.bio ?? null;
  const avatarUrl = user?.image ?? null;
  const initials = username.slice(0, 2).toUpperCase();

  return {
    user,
    username,
    bio,
    avatarUrl,
    initials,
    isLoading,
  };
}
