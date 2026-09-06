/// <reference types="jest" />

import {
  type AppearancePreference,
  persistOptimisticPreference,
  resolveAppearance,
} from '@/lib/ui/appearance-state';

describe('appearance resolution', () => {
  it.each([
    ['system', 'light', 'light'],
    ['system', 'dark', 'dark'],
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
    ['system', null, 'light'],
  ] as const)(
    'resolves %s preference against %s system appearance as %s',
    (preference, systemAppearance, expected) => {
      expect(resolveAppearance(preference, systemAppearance)).toBe(expected);
    }
  );
});

describe('optimistic appearance persistence', () => {
  it('keeps the new preference after persistence succeeds', async () => {
    const applied: AppearancePreference[] = [];

    await persistOptimisticPreference({
      next: 'dark',
      previous: 'system',
      apply: (preference) => applied.push(preference),
      persist: async () => undefined,
    });

    expect(applied).toEqual(['dark']);
  });

  it('rolls back to the prior preference when persistence fails', async () => {
    const applied: AppearancePreference[] = [];

    await expect(
      persistOptimisticPreference({
        next: 'light',
        previous: 'dark',
        apply: (preference) => applied.push(preference),
        persist: async () => {
          throw new Error('network unavailable');
        },
      })
    ).rejects.toThrow('network unavailable');

    expect(applied).toEqual(['light', 'dark']);
  });
});
