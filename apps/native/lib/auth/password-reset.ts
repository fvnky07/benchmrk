type ResetResponse = { error: unknown | null };

/** Completion depends on the server reset, not local authentication cleanup. */
export async function completePasswordReset(
  reset: () => Promise<ResetResponse>,
  signOut: () => Promise<unknown>
): Promise<boolean> {
  const result = await reset();
  if (result.error) return false;
  try {
    await signOut();
  } catch {
    // The server already accepted the password; cleanup cannot reverse it.
  }
  return true;
}
