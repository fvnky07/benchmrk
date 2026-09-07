import {
  distanceKilometersToMeters,
  distanceMetersToKilometers,
} from '@/lib/workout/distance';

describe('cardio distance display conversion', () => {
  it('converts stored meters to displayed kilometers and back', () => {
    expect(distanceMetersToKilometers(2500)).toBe(2.5);
    expect(distanceKilometersToMeters(2.5)).toBe(2500);
  });

  it('preserves zero distance', () => {
    expect(distanceMetersToKilometers(0)).toBe(0);
    expect(distanceKilometersToMeters(0)).toBe(0);
  });
});
