import { Text } from '@expo/ui';

import { Chart } from '@/components/charts/chart';
import { formatMinutes } from '@/lib/workout/time';

type TrendPoint = { label: string; value: number; at: number };

type TrendCardProps = {
  duration: readonly TrendPoint[];
  rest: {
    points: readonly TrendPoint[];
    plannedSeconds: number | null;
  };
};

function formatRest(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes === 0) return `${remainder} s`;
  const duration = formatMinutes(minutes * 60);
  return remainder === 0 ? duration : `${duration} ${remainder} s`;
}

export function TrendCard({ duration, rest }: TrendCardProps) {
  const firstDuration = duration[0];
  const lastDuration = duration[duration.length - 1];
  if (duration.length < 2 || !firstDuration || !lastDuration) {
    return <Text>Trends appear after two Workouts</Text>;
  }

  const firstRest = rest.points[0];
  const lastRest = rest.points[rest.points.length - 1];
  const durationSummary = `Duration over your last ${duration.length} Workouts: from ${formatMinutes(firstDuration.value)} to ${formatMinutes(lastDuration.value)}`;
  const restSummary =
    firstRest && lastRest
      ? `Average rest over your last ${rest.points.length} Workouts: from ${formatRest(firstRest.value)} to ${formatRest(lastRest.value)}${rest.plannedSeconds === null ? '' : `, planned ${formatRest(rest.plannedSeconds)}`}`
      : null;

  return (
    <>
      <Text textStyle={{ fontSize: 20, fontWeight: '600' }}>Duration</Text>
      <Chart
        kind="trend"
        points={duration.map((point) => ({
          label: point.label,
          value: point.value / 60,
        }))}
        summary={durationSummary}
      />
      <Text>{durationSummary}</Text>
      <Text textStyle={{ fontSize: 20, fontWeight: '600' }}>Average rest</Text>
      {rest.points.length < 2 || restSummary === null ? (
        <Text>Trends appear after two Workouts</Text>
      ) : (
        <>
          <Chart
            kind="trend"
            points={rest.points.map((point) => ({
              label: point.label,
              value: point.value,
            }))}
            reference={
              rest.plannedSeconds === null
                ? undefined
                : { label: 'Planned', value: rest.plannedSeconds }
            }
            summary={restSummary}
          />
          <Text>{restSummary}</Text>
        </>
      )}
    </>
  );
}
