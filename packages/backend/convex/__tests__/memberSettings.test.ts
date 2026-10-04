import { describe, expect, test } from 'vitest';

import { api } from '../_generated/api';
import { createTest } from './harness.testing';

const DEFAULTS = {
  appearance: 'system',
  units: 'kg',
  effortScale: 'RPE',
  defaultRestSeconds: 60,
  haptics: true,
  analyticsOptOut: false,
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

  test('keep a partial update and the remaining defaults', async () => {
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
      appearance: 'dark',
      units: 'lb',
      effortScale: 'RIR',
      defaultRestSeconds: 120,
      haptics: false,
      analyticsOptOut: true,
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
});
