import {
  bucketStats,
  formatStat,
  rangeStart,
  type StatsRange,
  type StatsWorkout,
  topExercises,
} from '@/lib/workout/stats';

/** A local time; months count from 1. */
function at(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): number {
  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  ).getTime();
}

/** Friday 26 December 2025, mid-afternoon. */
const NOW = at(2025, 12, 26, 15, 30);

function workout(
  finishedAt: number,
  sets: number,
  volumeKg = 0,
  exercises: StatsWorkout['exercises'] = []
): StatsWorkout {
  return { finishedAt, sets, volumeKg, exercises };
}

function exercise(exerciseId: string, name: string, sets: number) {
  return { exerciseId, name, sets };
}

describe('stats range starts', () => {
  test.each<[StatsRange, number]>([
    ['1W', at(2025, 12, 20)],
    ['1M', at(2025, 11, 24)],
    ['3M', at(2025, 10, 1)],
    ['6M', at(2025, 7, 1)],
    ['1Y', at(2025, 1, 1)],
  ])('%s starts at the local midnight of its first bucket', (range, start) => {
    expect(rangeStart(range, NOW)).toBe(start);
  });

  test('ALL has no start', () => {
    expect(rangeStart('ALL', NOW)).toBeNull();
  });

  test('a Sunday belongs to the week that started on Monday', () => {
    expect(rangeStart('1M', at(2025, 12, 28, 23, 59))).toBe(at(2025, 11, 24));
    expect(rangeStart('1M', at(2025, 12, 29))).toBe(at(2025, 12, 1));
  });

  test('months count back across the new year', () => {
    expect(rangeStart('3M', at(2026, 1, 15, 9))).toBe(at(2025, 11, 1));
  });
});

describe('stats buckets', () => {
  test('1W has a bar per day, today and the 6 days before, split at local midnight', () => {
    const stats = bucketStats(
      [
        workout(at(2025, 12, 19, 23, 59, 59, 999), 9),
        workout(at(2025, 12, 20), 3),
        workout(at(2025, 12, 20, 23, 59, 59, 999), 4),
        workout(at(2025, 12, 21), 5),
        workout(at(2025, 12, 26, 15), 6),
        workout(at(2025, 12, 27), 9),
      ],
      '1W',
      'sets',
      NOW,
      'en-GB'
    );

    expect(stats.bucket).toBe('day');
    expect(stats.points).toEqual([
      { label: 'Sat', value: 7 },
      { label: 'Sun', value: 5 },
      { label: 'Mon', value: 0 },
      { label: 'Tue', value: 0 },
      { label: 'Wed', value: 0 },
      { label: 'Thu', value: 0 },
      { label: 'Fri', value: 6 },
    ]);
    expect(stats.total).toBe(18);
    expect(stats.average).toBeCloseTo(18 / 7);
    expect(stats.periodLabel).toBe('20 Dec – 26 Dec 2025');
  });

  test('Sets and Volume sum different values of the same Workouts', () => {
    const workouts = [
      workout(at(2025, 12, 22, 18), 12, 4_800),
      workout(at(2025, 12, 24, 7), 8, 3_000),
      workout(at(2025, 12, 24, 19), 4, 0),
    ];

    const sets = bucketStats(workouts, '1W', 'sets', NOW, 'en-GB');
    const volume = bucketStats(workouts, '1W', 'volume', NOW, 'en-GB');

    expect(sets.points.map((point) => point.value)).toEqual([
      0, 0, 12, 0, 12, 0, 0,
    ]);
    expect(volume.points.map((point) => point.value)).toEqual([
      0, 0, 4_800, 0, 3_000, 0, 0,
    ]);
    expect([sets.total, volume.total]).toEqual([24, 7_800]);
    expect(volume.average).toBeCloseTo(7_800 / 7);
  });

  test('1M has a bar per calendar week from Monday', () => {
    const stats = bucketStats(
      [
        workout(at(2025, 11, 23, 23, 59), 9),
        workout(at(2025, 11, 24), 2),
        workout(at(2025, 11, 30, 23, 59), 3),
        workout(at(2025, 12, 1), 4),
        workout(at(2025, 12, 26, 10), 5),
      ],
      '1M',
      'sets',
      NOW,
      'en-GB'
    );

    expect(stats.bucket).toBe('week');
    expect(stats.points).toEqual([
      { label: '24 Nov', value: 5 },
      { label: '1 Dec', value: 4 },
      { label: '8 Dec', value: 0 },
      { label: '15 Dec', value: 0 },
      { label: '22 Dec', value: 5 },
    ]);
    expect(stats.average).toBe(14 / 5);
    expect(stats.periodLabel).toBe('24 Nov – 26 Dec 2025');
  });

  test('3M, 6M and 1Y have a bar per calendar month', () => {
    const workouts = [
      workout(at(2025, 9, 30, 23, 59, 59, 999), 9),
      workout(at(2025, 10, 1), 2),
      workout(at(2025, 10, 31, 23, 59, 59, 999), 3),
      workout(at(2025, 11, 1), 4),
    ];

    const quarter = bucketStats(workouts, '3M', 'sets', NOW, 'en-GB');
    expect(quarter.bucket).toBe('month');
    expect(quarter.points).toEqual([
      { label: 'Oct', value: 5 },
      { label: 'Nov', value: 4 },
      { label: 'Dec', value: 0 },
    ]);
    expect(quarter.average).toBe(3);
    expect(quarter.periodLabel).toBe('1 Oct – 26 Dec 2025');

    expect(
      bucketStats(workouts, '6M', 'sets', NOW, 'en-GB').points.map(
        (point) => point.value
      )
    ).toEqual([0, 0, 9, 5, 4, 0]);

    const year = bucketStats(workouts, '1Y', 'sets', NOW, 'en-GB');
    expect(year.points).toHaveLength(12);
    expect(year.points[0]?.label).toBe('Jan');
    expect(year.total).toBe(18);
    expect(year.average).toBe(18 / 12);
    expect(year.periodLabel).toBe('1 Jan – 26 Dec 2025');
  });

  test('ALL runs from the oldest Workout’s month, with the year on labels past 12 months', () => {
    const stats = bucketStats(
      [workout(at(2025, 12, 2), 6), workout(at(2024, 11, 15), 4)],
      'ALL',
      'sets',
      NOW,
      'en-GB'
    );

    expect(stats.points).toHaveLength(14);
    expect(stats.points[0]).toEqual({ label: 'Nov 24', value: 4 });
    expect(stats.points[13]).toEqual({ label: 'Dec 25', value: 6 });
    expect(new Set(stats.points.map((point) => point.label)).size).toBe(14);
    expect(stats.average).toBe(10 / 14);
    expect(stats.periodLabel).toBe('1 Nov 2024 – 26 Dec 2025');
  });

  test('ALL without Workouts is this month with nothing in it', () => {
    expect(bucketStats([], 'ALL', 'volume', NOW, 'en-GB')).toEqual({
      bucket: 'month',
      points: [{ label: 'Dec', value: 0 }],
      total: 0,
      average: 0,
      periodLabel: '1 Dec – 26 Dec 2025',
    });
  });

  test.each<[string, number, number]>([
    ['Europe ends summer time', at(2025, 10, 26, 23, 30), at(2025, 10, 20)],
    ['the US ends summer time', at(2025, 11, 2, 23, 30), at(2025, 10, 27)],
    ['Europe starts summer time', at(2025, 3, 31, 0, 30), at(2025, 3, 25)],
  ])('1W keeps whole calendar days when %s', (_, now, first) => {
    expect(rangeStart('1W', now)).toBe(first);
    const stats = bucketStats(
      [workout(first, 2), workout(now - 15 * 60_000, 3)],
      '1W',
      'sets',
      now,
      'en-GB'
    );
    expect(stats.points.map((point) => point.value)).toEqual([
      2, 0, 0, 0, 0, 0, 3,
    ]);
  });
});

describe('top exercises', () => {
  const workouts = [
    workout(at(2025, 12, 22), 9, 0, [
      exercise('squat', 'Squat', 4),
      exercise('bench', 'Bench Press', 3),
      exercise('row', 'Row', 2),
    ]),
    workout(at(2025, 12, 24), 8, 0, [
      exercise('bench', 'Bench Press', 3),
      exercise('press', 'Overhead Press', 2),
      exercise('curl', 'Curl', 2),
      exercise('dip', 'Dip', 1),
    ]),
    workout(at(2025, 12, 25), 1, 0, [
      exercise('custom-squat', 'Squat', 1),
      exercise('lunge', 'Lunge', 0),
    ]),
  ];

  test('sums Sets per Exercise across Workouts, most first and ties by name, five by default', () => {
    expect(topExercises(workouts)).toEqual([
      { exerciseId: 'bench', name: 'Bench Press', sets: 6 },
      { exerciseId: 'squat', name: 'Squat', sets: 4 },
      { exerciseId: 'curl', name: 'Curl', sets: 2 },
      { exerciseId: 'press', name: 'Overhead Press', sets: 2 },
      { exerciseId: 'row', name: 'Row', sets: 2 },
    ]);
  });

  test('keeps same-named Exercises apart and leaves out Exercises without Sets', () => {
    expect(topExercises(workouts, 10).map((entry) => entry.exerciseId)).toEqual(
      ['bench', 'squat', 'curl', 'press', 'row', 'dip', 'custom-squat']
    );
  });
});

describe('stat numbers', () => {
  test.each<[number, string]>([
    [0, '0'],
    [10.4, '10'],
    [9_999.4, '9999'],
    [10_000, '10k'],
    [12_345, '12.3k'],
    [123_456, '123k'],
    [999_499, '999k'],
    [999_500, '1M'],
    [2_500_000, '2.5M'],
  ])('%s shows as %s', (value, shown) => {
    expect(formatStat(value)).toBe(shown);
  });
});
