import { DEFAULT_PLATES } from '@repo/backend/convex/domain/plates';

import { plateLoad, plateStrip } from '@/lib/workout/plates';

describe('plate calculator', () => {
  test('loads an exact weight heaviest plate first', () => {
    expect(plateLoad(82.5, DEFAULT_PLATES.kg)).toEqual({
      kind: 'loaded',
      perSide: [25, 5, 1.25],
      short: 0,
    });
    expect(plateStrip(82.5, DEFAULT_PLATES.kg)).toBe(
      '20 kg bar + 25 + 5 + 1.25 per side'
    );
    expect(plateStrip(20, DEFAULT_PLATES.kg)).toBe('Just the 20 kg bar');
  });

  test('says how much the inventory falls short', () => {
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
    expect(plateStrip(23, DEFAULT_PLATES.kg)).toBe(
      '20 kg bar + 1.25 per side · 0.5 kg short'
    );
  });

  test('a weight under the bar is below the bar', () => {
    expect(plateStrip(15, DEFAULT_PLATES.kg)).toBe('Below the 20 kg bar');
    expect(plateStrip(40, DEFAULT_PLATES.lb)).toBe('Below the 45 lb bar');
  });

  test('pound plates load from the 45 lb bar', () => {
    expect(plateStrip(225, DEFAULT_PLATES.lb)).toBe(
      '45 lb bar + 45 + 45 per side'
    );
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

    expect(plateStrip(65, noTwentyFives)).toBe('15 kg bar + 20 + 5 per side');
  });
});
