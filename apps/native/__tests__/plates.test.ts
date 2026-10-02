import { DEFAULT_PLATES } from '@repo/backend/convex/domain/plates';

import { plateLoad } from '@/lib/workout/plates';

describe('plate calculator', () => {
  test('loads an exact weight heaviest plate first', () => {
    expect(plateLoad(82.5, DEFAULT_PLATES.kg)).toEqual({
      kind: 'loaded',
      perSide: [25, 5, 1.25],
      short: 0,
    });
    expect(plateLoad(20, DEFAULT_PLATES.kg)).toEqual({
      kind: 'loaded',
      perSide: [],
      short: 0,
    });
  });

  test('reports the inventory shortfall in kilograms', () => {
    const fewPlates = {
      unit: 'kg' as const,
      barWeight: 20,
      plates: [{ weight: 20, pairs: 1 }],
    };

    expect(plateLoad(110, fewPlates)).toEqual({
      kind: 'loaded',
      perSide: [20],
      short: 50,
    });
    expect(plateLoad(23, DEFAULT_PLATES.kg)).toEqual({
      kind: 'loaded',
      perSide: [1.25],
      short: 0.5,
    });
  });

  test('a weight under the bar is below the bar', () => {
    expect(plateLoad(15, DEFAULT_PLATES.kg)).toEqual({
      kind: 'below',
      barWeight: 20,
    });
    expect(plateLoad(40, DEFAULT_PLATES.lb)).toEqual({
      kind: 'below',
      barWeight: 45,
    });
  });

  test('pound plates load from the 45 lb bar', () => {
    expect(plateLoad(225, DEFAULT_PLATES.lb)).toEqual({
      kind: 'loaded',
      perSide: [45, 45],
      short: 0,
    });
    expect(plateLoad(140, DEFAULT_PLATES.lb)).toEqual({
      kind: 'loaded',
      perSide: [45, 2.5],
      short: 0,
    });
  });

  test('an edited inventory changes the load', () => {
    const noTwentyFives = {
      ...DEFAULT_PLATES.kg,
      barWeight: 15,
      plates: DEFAULT_PLATES.kg.plates.map((plate) =>
        plate.weight === 25 ? { ...plate, pairs: 0 } : plate
      ),
    };

    expect(plateLoad(65, noTwentyFives)).toEqual({
      kind: 'loaded',
      perSide: [20, 5],
      short: 0,
    });
  });
});
