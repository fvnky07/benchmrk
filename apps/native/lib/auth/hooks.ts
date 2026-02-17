// Auth hook using Better Auth session
import { authClient } from './client';

export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  [key: string]: unknown;
}

export interface UseAuthReturn {
  /** The authenticated user object or undefined */
  user: User | undefined;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the session is loading */
  isLoading: boolean;
}

/**
 * Authentication hook using Better Auth session
 * 
 * Single source of truth for auth state - all auth checks should use this hook.
 * This is the ONLY place where authClient.useSession() should be called.
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, isLoading } = useAuth();
 * 
 * if (isLoading) return <Loading />;
 * if (!isAuthenticated) return <Login />;
 * 
 * return <div>Welcome {user?.name}</div>;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const session = authClient.useSession();
  const user = session.data?.user as User | undefined;

  return {
    user,
    isAuthenticated: !!user,
    isLoading: session.isPending,
  };
}
