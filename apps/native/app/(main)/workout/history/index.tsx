import { Button, Column, RNHostView, Row, ScrollView, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { type ErrorBoundaryProps, router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Chart } from '@/components/charts/chart';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { PillChip } from '@/components/native/pill-chip';
import { SectionHeader } from '@/components/native/section-header';
import { SegmentedControl } from '@/components/native/segmented-control';
import { StatRow } from '@/components/native/stat-tile';
import {
  accessibilityModifier,
  font,
  space,
  tabularDigits,
  textColor,
  useCardContentWidth,
  useColors,
} from '@/lib/ui';
import { formatClock, weightInUnit } from '@/lib/workout/format';
import {
  bucketStats,
  formatStat,
  rangeStart,
  STATS_RANGES,
  type StatsMetric,
  type StatsRange,
  type StatsWorkout,
  topExercises,
} from '@/lib/workout/stats';
import { useNow } from '@/lib/workout/use-now';

const METRICS: readonly Readonly<{ label: string; value: StatsMetric }>[] = [
  { label: 'Sets', value: 'sets' },
  { label: 'Volume', value: 'volume' },
];

const RANGE_LABELS: Record<StatsRange, string> = {
  '1W': '1W',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '1Y': '1Y',
  ALL: 'All',
};

type LoadedStats = Readonly<{
  range: StatsRange;
  workouts: readonly StatsWorkout[];
}>;

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const colors = useColors();
  return (
    <NativeScreen>
      <Card padding={space.lg} spacing={space.xs}>
        <Text
          textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
        >
          Could not load history
        </Text>
        <Text
          textStyle={{
            ...font.caption,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Try again to load your Workouts.
        </Text>
      </Card>
      <Button
        label="Try again"
        modifiers={[accessibilityModifier('Try loading Workout history again')]}
        onPress={() => void retry()}
      />
    </NativeScreen>
  );
}

/** Sets or Volume per day, week or month of a range, and its top Exercises. */
function WorkoutStats() {
  const colors = useColors();
  const chartWidth = useCardContentWidth();
  const now = useNow(60_000);
  const [metric, setMetric] = useState<StatsMetric>('sets');
  const [range, setRange] = useState<StatsRange>('1W');
  const workouts = useQuery(api.history.stats, {
    since: rangeStart(range, now),
  });
  const settings = useQuery(api.memberSettings.get);
  // A newly picked range keeps showing the last loaded one until it arrives.
  const [lastLoaded, setLastLoaded] = useState<LoadedStats | null>(null);
  useEffect(() => {
    if (workouts !== undefined) setLastLoaded({ range, workouts });
  }, [range, workouts]);

  const loaded = workouts === undefined ? lastLoaded : { range, workouts };
  const units = settings?.units ?? 'kg';
  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };
  const loadingCard = (
    <Card padding={space.lg}>
      <Text textStyle={caption}>Loading stats…</Text>
    </Card>
  );

  const stats = loaded
    ? bucketStats(loaded.workouts, loaded.range, metric, now)
    : null;
  const top = loaded ? topExercises(loaded.workouts) : null;
  const inUnits = (value: number) =>
    metric === 'volume' ? weightInUnit(value, units) : value;
  const points = (stats?.points ?? []).map((point) => ({
    label: point.label,
    value: inUnits(point.value),
  }));
  const tiles = stats
    ? [
        {
          label: `Average per ${stats.bucket}`,
          value: formatStat(inUnits(stats.average)),
        },
        { label: 'Total', value: formatStat(inUnits(stats.total)) },
      ].map((tile) => ({
        ...tile,
        unit: metric === 'volume' ? units : tile.value === '1' ? 'Set' : 'Sets',
      }))
    : [];

  return (
    <>
      <SegmentedControl options={METRICS} value={metric} onChange={setMetric} />
      {stats ? (
        <>
          <Column spacing={space.sm}>
            <StatRow tiles={tiles} />
            <Text textStyle={caption}>{stats.periodLabel}</Text>
          </Column>
          <Card padding={space.lg}>
            <RNHostView matchContents>
              <Chart
                kind="bar"
                width={chartWidth}
                points={points}
                tone="accent"
                height={180}
                summary={`${metric === 'sets' ? 'Sets' : `Volume in ${units}`} per ${stats.bucket}, ${stats.periodLabel}: ${points
                  .map((point) => `${point.label} ${formatStat(point.value)}`)
                  .join(', ')}`}
              />
            </RNHostView>
          </Card>
        </>
      ) : (
        loadingCard
      )}
      <ScrollView direction="horizontal" showsIndicators={false}>
        <Row spacing={space.sm}>
          {STATS_RANGES.map((option) => (
            <PillChip
              key={option}
              label={RANGE_LABELS[option]}
              selected={option === range}
              onPress={() => setRange(option)}
            />
          ))}
        </Row>
      </ScrollView>
      <Column spacing={space.sm}>
        <SectionHeader
          title="Top Exercises"
          supportingText="By Sets in this range"
        />
        {top === null ? (
          loadingCard
        ) : top.length === 0 ? (
          <Card padding={space.lg}>
            <Text textStyle={caption}>No logged Sets in this range</Text>
          </Card>
        ) : (
          <Card divided>
            {top.map((exercise) => (
              <CardRow
                key={exercise.exerciseId}
                trailing={
                  <Text
                    textStyle={{
                      ...font.bodyStrong,
                      color: textColor(colors.onSurface),
                    }}
                    modifiers={tabularDigits()}
                  >
                    {`${exercise.sets} ${exercise.sets === 1 ? 'Set' : 'Sets'}`}
                  </Text>
                }
              >
                {exercise.name}
              </CardRow>
            ))}
          </Card>
        )}
      </Column>
    </>
  );
}

export default function WorkoutHistoryScreen() {
  const colors = useColors();
  const { results, status, loadMore } = usePaginatedQuery(
    api.history.list,
    {},
    { initialNumItems: 20 }
  );
  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };

  return (
    <NativeScreen>
      <WorkoutStats />
      <Column spacing={space.sm}>
        <SectionHeader title="Workouts" />
        {status === 'LoadingFirstPage' ? (
          <Card padding={space.lg}>
            <Text textStyle={caption}>Loading Workouts…</Text>
          </Card>
        ) : results.length === 0 ? (
          <Card padding={space.lg} spacing={space.xs}>
            <Text
              textStyle={{
                ...font.bodyStrong,
                color: textColor(colors.onSurface),
              }}
            >
              No completed Workouts yet
            </Text>
            <Text textStyle={caption}>
              Completed Workouts appear here, including Workouts ended early
              with logged Sets.
            </Text>
          </Card>
        ) : (
          <Card divided>
            {results.map((workout) => {
              const date = new Date(workout.finishedAt).toLocaleDateString(
                undefined,
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              );
              const summary = `${date} · ${formatClock(workout.durationSeconds)} · ${workout.setsDone} ${workout.setsDone === 1 ? 'Set' : 'Sets'}`;
              const label = `View ${workout.name}, ${summary}`;
              return (
                <CardRow
                  key={workout.workoutId}
                  chevron
                  modifiers={[accessibilityModifier(label)]}
                  supportingText={summary}
                  onPress={() =>
                    router.push(`/workout/history/${workout.workoutId}`)
                  }
                >
                  {workout.name}
                </CardRow>
              );
            })}
          </Card>
        )}
        {status === 'CanLoadMore' || status === 'LoadingMore' ? (
          <Button
            disabled={status === 'LoadingMore'}
            label={status === 'LoadingMore' ? 'Loading…' : 'Load more Workouts'}
            modifiers={[accessibilityModifier('Load more completed Workouts')]}
            onPress={() => loadMore(20)}
            variant="text"
          />
        ) : null}
      </Column>
    </NativeScreen>
  );
}
