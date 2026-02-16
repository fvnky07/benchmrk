// Auth hook using Better Auth session
import { authClient } from "./auth-client";

interface UseAuthReturn {
	isAuthenticated: boolean;
	isLoading: boolean;
}

/**
 * Authentication hook using Better Auth session
 * Checks if user has an active session
 */
export function useAuth(): UseAuthReturn {
	const session = authClient.useSession();

	return {
		isAuthenticated: !!session.data?.user,
		isLoading: session.isPending,
	};
}
