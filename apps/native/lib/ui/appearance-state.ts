export type AppearancePreference = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

export function resolveAppearance(
  preference: AppearancePreference | null | undefined,
  systemAppearance: string | null | undefined
): ResolvedAppearance {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return systemAppearance === 'dark' ? 'dark' : 'light';
}

export async function persistOptimisticPreference({
  next,
  previous,
  persist,
  apply,
}: {
  next: AppearancePreference;
  previous: AppearancePreference;
  persist: (preference: AppearancePreference) => Promise<unknown>;
  apply: (preference: AppearancePreference) => void;
}): Promise<void> {
  apply(next);

  try {
    await persist(next);
  } catch (error) {
    apply(previous);
    throw error;
  }
}
