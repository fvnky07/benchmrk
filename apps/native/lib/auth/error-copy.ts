/**
 * Copy for backend error codes the auth screens surface. Convex functions throw
 * them as `ConvexError` codes (read with `errorCode`); Better Auth routes report
 * them as `error.code`.
 */
const AUTH_ERROR_COPY: Record<string, string> = {
  EMAIL_DELIVERY_FAILED: 'We couldn’t send the email. Try again.',
  NOT_AUTHENTICATED: 'Your session ended. Log in and try again.',
};

export function authErrorCopy(
  code: string | null | undefined,
  fallback: string
): string {
  return AUTH_ERROR_COPY[code ?? ''] ?? fallback;
}
