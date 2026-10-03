import { durationDifference } from '@/lib/workout/time';

const TARGET_SECONDS = 45 * 60;

describe('finished Workout duration difference', () => {
  test.each([-20, 0, 20])(
    '%s seconds from the target reads as on target',
    (delta) => {
      expect(durationDifference(TARGET_SECONDS + delta, TARGET_SECONDS)).toBe(
        'On target'
      );
    }
  );

  test.each([
    [-40, '−1 min'],
    [40, '+1 min'],
    [-3600, '−1 h'],
    [3900, '+1 h 5 min'],
  ])('%s seconds has the sign of the rounded difference', (delta, expected) => {
    expect(
      durationDifference(TARGET_SECONDS + Number(delta), TARGET_SECONDS)
    ).toBe(expected);
  });
});
