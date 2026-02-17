import { authClient } from '../auth';

export interface ExtendedUser {
  displayUsername?: string;
  username?: string;
  bio?: string;
}

export interface UserProfile {
  /** The authenticated user object from Better Auth */
  user: Record<string, unknown> | undefined;
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
 * @example
 * ```tsx
 * const { username, bio, avatarUrl, initials, isLoading } = useUserProfile();
 * ```
 */
export function useUserProfile(): UserProfile {
  const session = authClient.useSession();
  const user = session.data?.user;

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
    isLoading: session.isPending,
  };
}
