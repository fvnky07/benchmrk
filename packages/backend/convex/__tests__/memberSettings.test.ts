import { describe, expect, test } from 'vitest';

import { api } from '../_generated/api';
import { DEFAULT_PLATES } from '../domain/plates';
import { toKg } from '../domain/units';
import { createTest } from './harness.testing';

const DEFAULT_QUICK_ACTIONS = [
  { id: 'wand', visible: true },
  { id: 'addSet', visible: true },
  { id: 'info', visible: true },
  { id: 'swap', visible: true },
  { id: 'note', visible: true },
  { id: 'setup', visible: true },
  { id: 'plates', visible: false },
];

const DEFAULTS = {
  appearance: 'system',
  units: 'kg',
  effortScale: 'RPE',
  defaultRestSeconds: 60,
  haptics: true,
  analyticsOptOut: false,
  quickActions: DEFAULT_QUICK_ACTIONS,
  swipeHintDismissed: false,
  restEndSound: true,
  overloadTargets: true,
  targetsOffExerciseIds: [],
  smallestIncrementKg: 1.25,
  autoAdvance: true,
  plates: DEFAULT_PLATES.kg,
  aheadBehind: true,
  invitesFrom: 'everyone',
  pushNotifications: true,
  pushInvites: true,
  pushJoins: true,
  pushLeaves: true,
  pushGroupEnded: true,
};

describe('member settings', () => {
  test('are unavailable when signed out', async () => {
    const t = createTest();

    expect(await t.query(api.memberSettings.get, {})).toBeNull();
    await expect(
      t.mutation(api.memberSettings.update, { units: 'lb' })
    ).rejects.toThrow('Not authenticated');
  });

  test('come back with defaults before anything is saved', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });

    expect(await member.query(api.memberSettings.get, {})).toEqual(DEFAULTS);
  });

  test('keep a partial update and the remaining defaults, with unit-based defaults following the unit', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });

    await member.mutation(api.memberSettings.update, {
      units: 'lb',
      effortScale: 'RIR',
    });
    await member.mutation(api.memberSettings.update, {
      defaultRestSeconds: 120,
      haptics: false,
      analyticsOptOut: true,
      appearance: 'dark',
    });

    expect(await member.query(api.memberSettings.get, {})).toEqual({
      ...DEFAULTS,
      appearance: 'dark',
      units: 'lb',
      effortScale: 'RIR',
      defaultRestSeconds: 120,
      haptics: false,
      analyticsOptOut: true,
      smallestIncrementKg: toKg(2.5, 'lb'),
      plates: DEFAULT_PLATES.lb,
    });
  });

  test('belong to one Benchmrk identity only', async () => {
    const t = createTest();
    const memberA = t.withIdentity({ subject: 'member-a' });
    const memberB = t.withIdentity({ subject: 'member-b' });

    await memberA.mutation(api.memberSettings.update, { units: 'lb' });

    expect(await memberB.query(api.memberSettings.get, {})).toEqual(DEFAULTS);
  });

  test('reset restores every default', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });

    await member.mutation(api.memberSettings.update, {
      units: 'lb',
      haptics: false,
    });
    await member.mutation(api.memberSettings.reset, {});

    expect(await member.query(api.memberSettings.get, {})).toEqual(DEFAULTS);
  });

  test('refuse a default rest that is not a whole, non-negative second count', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });

    await expect(
      member.mutation(api.memberSettings.update, { defaultRestSeconds: -5 })
    ).rejects.toThrow('INVALID_DEFAULT_REST');
    await expect(
      member.mutation(api.memberSettings.update, { defaultRestSeconds: 12.5 })
    ).rejects.toThrow('INVALID_DEFAULT_REST');
  });

  test('keep the quick action chips in the order and visibility the member chose', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });
    const chosen = [
      { id: 'info', visible: true },
      { id: 'addSet', visible: true },
      { id: 'plates', visible: true },
      { id: 'wand', visible: false },
      { id: 'swap', visible: true },
      { id: 'note', visible: false },
      { id: 'setup', visible: true },
    ] as const;

    await member.mutation(api.memberSettings.update, {
      quickActions: [...chosen],
    });

    expect(
      (await member.query(api.memberSettings.get, {}))?.quickActions
    ).toEqual(chosen);
  });

  test('refuse a quick action list that drops or repeats a chip', async () => {
    const member = createTest().withIdentity({ subject: 'member-a' });

    await expect(
      member.mutation(api.memberSettings.update, {
        quickActions: DEFAULT_QUICK_ACTIONS.slice(1) as never,
      })
    ).rejects.toThrow('INVALID_QUICK_ACTIONS');
    await expect(
      member.mutation(api.memberSettings.update, {
        quickActions: [
          ...DEFAULT_QUICK_ACTIONS.slice(0, 6),
          { id: 'wand', visible: false },
        ] as never,
      })
    ).rejects.toThrow('INVALID_QUICK_ACTIONS');
  });
});
