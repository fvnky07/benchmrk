import { describe, expect, test } from 'vitest';

import { api, internal } from '../_generated/api';
import { createTest } from './harness.testing';

const POUND_IN_KG = 0.45359237;

describe('Exercise catalog', () => {
  test('seeding twice adds nothing and never rewrites an existing Exercise', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    await t.run(async (ctx) => {
      const bench = await ctx.db
        .query('exercises')
        .withIndex('by_slug', (q) => q.eq('slug', 'bench-press'))
        .unique();
      if (!bench) throw new Error('bench press missing');
      await ctx.db.patch(bench._id, { name: 'Flat Bench Press' });
    });
    const before = await t.run((ctx) => ctx.db.query('exercises').collect());

    await t.mutation(internal.init.seed, {});

    const after = await t.run((ctx) => ctx.db.query('exercises').collect());
    expect(after).toHaveLength(before.length);
    expect(after.find((e) => e.slug === 'bench-press')?.name).toBe(
      'Flat Bench Press'
    );
  });

  test('every Exercise exposes type, equipment and its default step in kg', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const member = t.withIdentity({ subject: 'member-a' });

    const catalog = await member.query(api.exercises.list, {});
    const bySlug = new Map(
      catalog.map((exercise) => [exercise.slug, exercise])
    );

    expect(bySlug.get('bench-press')).toMatchObject({
      type: 'strength',
      equipment: 'barbell',
      defaultStepKg: 2.5,
    });
    expect(bySlug.get('leg-press')).toMatchObject({
      equipment: 'machine',
      defaultStepKg: 5,
    });
    expect(bySlug.get('cable-row')).toMatchObject({
      equipment: 'cable',
      defaultStepKg: 5,
    });
    expect(bySlug.get('plank')).toMatchObject({ type: 'timed' });
    expect(
      catalog.find((exercise) => exercise.equipment === 'dumbbell')
        ?.defaultStepKg
    ).toBe(1);
  });

  test('a member training in pounds gets steps of 5, 2 and 10 lb', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const member = t.withIdentity({ subject: 'member-a' });
    await member.mutation(api.memberSettings.update, { units: 'lb' });

    const catalog = await member.query(api.exercises.list, {});
    const step = (equipment: string) =>
      catalog.find((exercise) => exercise.equipment === equipment)
        ?.defaultStepKg;

    expect(step('barbell')).toBeCloseTo(5 * POUND_IN_KG, 9);
    expect(step('dumbbell')).toBeCloseTo(2 * POUND_IN_KG, 9);
    expect(step('machine')).toBeCloseTo(10 * POUND_IN_KG, 9);
  });

  test('a custom Exercise is visible only to its creator', async () => {
    const t = createTest();
    const creator = t.withIdentity({ subject: 'member-a' });
    const other = t.withIdentity({ subject: 'member-b' });

    const { slug } = await creator.mutation(api.exercises.createCustom, {
      name: '  Landmine Press ',
      type: 'strength',
      equipment: 'barbell',
    });

    const mine = await creator.query(api.exercises.list, {});
    expect(mine).toContainEqual(
      expect.objectContaining({
        name: 'Landmine Press',
        isCustom: true,
        defaultStepKg: 2.5,
      })
    );
    expect(
      await creator.query(api.exercises.getBySlug, { slug })
    ).toMatchObject({ name: 'Landmine Press' });

    expect(await other.query(api.exercises.list, {})).not.toContainEqual(
      expect.objectContaining({ name: 'Landmine Press' })
    );
    expect(await other.query(api.exercises.getBySlug, { slug })).toBeNull();
  });

  test('a custom Exercise needs a name and a signed-in creator', async () => {
    const t = createTest();

    await expect(
      t
        .withIdentity({ subject: 'member-a' })
        .mutation(api.exercises.createCustom, {
          name: '   ',
          type: 'strength',
          equipment: 'other',
        })
    ).rejects.toThrow('EMPTY_EXERCISE_NAME');
    await expect(
      t.mutation(api.exercises.createCustom, {
        name: 'Sled Push',
        type: 'strength',
        equipment: 'other',
      })
    ).rejects.toThrow('Not authenticated');
  });
});
