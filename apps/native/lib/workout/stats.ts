import type { ChartPoint } from '@/components/charts/chart-types';

export type StatsRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

/** The History ranges, shortest first. */
export const STATS_RANGES: readonly StatsRange[] = [
  '1W',
  '1M',
  '3M',
  '6M',
  '1Y',
  'ALL',
];

export type StatsMetric = 'sets' | 'volume';

/** What one bar of a range covers. */
export type StatsBucket = 'day' | 'week' | 'month';

/** A completed Workout as `history.stats` returns it; Sets are completed Working Sets. */
export type StatsWorkout = Readonly<{
  finishedAt: number;
  sets: number;
  volumeKg: number;
  exercises: readonly Readonly<{
    exerciseId: string;
    name: string;
    sets: number;
  }>[];
}>;

export type BucketedStats = Readonly<{
  bucket: StatsBucket;
  /** One bar per bucket, oldest first; Volume in kg. */
  points: ChartPoint[];
  total: number;
  /** `total` per bucket. */
  average: number;
  /** The covered dates, e.g. "20 Dec – 26 Dec 2025". */
  periodLabel: string;
}>;

export type TopExercise = Readonly<{
  exerciseId: string;
  name: string;
  sets: number;
}>;

/**
 * Each range's buckets, the last one holding now: 1W is today and the 6 days
 * before, 1M this calendar week (from Monday) and the 4 before, the others
 * calendar months. ALL starts at the oldest Workout's month.
 */
const RANGES: Record<
  StatsRange,
  Readonly<{ bucket: StatsBucket; count: number | null }>
> = {
  '1W': { bucket: 'day', count: 7 },
  '1M': { bucket: 'week', count: 5 },
  '3M': { bucket: 'month', count: 3 },
  '6M': { bucket: 'month', count: 6 },
  '1Y': { bucket: 'month', count: 12 },
  ALL: { bucket: 'month', count: null },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The local midnight that starts the bucket holding `time`. */
function bucketOf(bucket: StatsBucket, time: number): Date {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = date.getMonth();
  switch (bucket) {
    case 'day':
      return new Date(year, month, date.getDate());
    case 'week':
      return new Date(year, month, date.getDate() - ((date.getDay() + 6) % 7));
    case 'month':
      return new Date(year, month, 1);
  }
}

/** The start of the bucket `offset` buckets after the one starting at `start`. */
function shift(bucket: StatsBucket, start: Date, offset: number): Date {
  const year = start.getFullYear();
  const month = start.getMonth();
  switch (bucket) {
    case 'day':
      return new Date(year, month, start.getDate() + offset);
    case 'week':
      return new Date(year, month, start.getDate() + 7 * offset);
    case 'month':
      return new Date(year, month + offset, 1);
  }
}

/** Which bucket after the one starting at `start` holds `time`; negative before it. */
function bucketIndex(bucket: StatsBucket, start: Date, time: number): number {
  const own = bucketOf(bucket, time);
  if (bucket === 'month') {
    return (
      (own.getFullYear() - start.getFullYear()) * 12 +
      own.getMonth() -
      start.getMonth()
    );
  }
  // Rounding absorbs the 23- and 25-hour days of daylight-saving changes.
  const days = Math.round((own.getTime() - start.getTime()) / DAY_MS);
  return bucket === 'week' ? Math.floor(days / 7) : days;
}

/** Bar labels; months carry the year once a range spans more than 12. */
function labelOptions(
  bucket: StatsBucket,
  count: number
): Intl.DateTimeFormatOptions {
  switch (bucket) {
    case 'day':
      return { weekday: 'short' };
    case 'week':
      return { day: 'numeric', month: 'short' };
    case 'month':
      return count > 12
        ? { month: 'short', year: '2-digit' }
        : { month: 'short' };
  }
}

function periodLabel(start: Date, end: Date, locale?: string): string {
  const withYear = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const from = start.toLocaleDateString(
    locale,
    start.getFullYear() === end.getFullYear()
      ? { day: 'numeric', month: 'short' }
      : withYear
  );
  return `${from} – ${end.toLocaleDateString(locale, withYear)}`;
}

/** When a range's first bucket starts, as a local-midnight timestamp; null for ALL. */
export function rangeStart(range: StatsRange, now: number): number | null {
  const { bucket, count } = RANGES[range];
  return count === null
    ? null
    : shift(bucket, bucketOf(bucket, now), 1 - count).getTime();
}

/**
 * Sums a metric per bucket of a range. Workouts outside the range's buckets
 * are ignored; `locale` (the device's by default) formats the dates.
 */
export function bucketStats(
  workouts: readonly StatsWorkout[],
  range: StatsRange,
  metric: StatsMetric,
  now: number,
  locale?: string
): BucketedStats {
  const { bucket } = RANGES[range];
  const start = bucketOf(
    bucket,
    rangeStart(range, now) ??
      Math.min(now, ...workouts.map((workout) => workout.finishedAt))
  );
  const count = bucketIndex(bucket, start, now) + 1;
  const values = Array.from({ length: count }, () => 0);
  for (const workout of workouts) {
    const index = bucketIndex(bucket, start, workout.finishedAt);
    if (index >= 0 && index < count) {
      values[index] += metric === 'sets' ? workout.sets : workout.volumeKg;
    }
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  const options = labelOptions(bucket, count);
  return {
    bucket,
    points: values.map((value, index) => ({
      label: shift(bucket, start, index).toLocaleDateString(locale, options),
      value,
    })),
    total,
    average: total / count,
    periodLabel: periodLabel(start, new Date(now), locale),
  };
}

/** The Exercises with the most completed Working Sets, most first; ties by name. */
export function topExercises(
  workouts: readonly StatsWorkout[],
  limit = 5
): TopExercise[] {
  const totals = new Map<string, TopExercise>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const sets = (totals.get(exercise.exerciseId)?.sets ?? 0) + exercise.sets;
      totals.set(exercise.exerciseId, { ...exercise, sets });
    }
  }
  return [...totals.values()]
    .filter((exercise) => exercise.sets > 0)
    .sort(
      (first, second) =>
        second.sets - first.sets || first.name.localeCompare(second.name)
    )
    .slice(0, limit);
}

/**
 * A stat as a tile shows it: a whole number, shortened from 10,000 on
 * ("12.3k", "1.2M") so it fits a half-width tile.
 */
export function formatStat(value: number): string {
  const whole = Math.round(value);
  if (whole < 10_000) return String(whole);
  const [scaled, suffix] =
    whole < 999_500 ? [whole / 1_000, 'k'] : [whole / 1_000_000, 'M'];
  return `${Number(scaled.toFixed(scaled < 100 ? 1 : 0))}${suffix}`;
}
