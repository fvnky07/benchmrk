/**
 * The one chart interface both platforms implement (chart.ios.tsx on Swift
 * Charts, chart.android.tsx on Compose). First-release charts only: plain or
 * stacked bars and single-series trends, with no zoom, selection or tooltips.
 */

/** Semantic colours; each platform maps them to its own palette. */
export type ChartTone = 'accent' | 'secondary' | 'tertiary' | 'neutral';

export type ChartSegment = { label: string; value: number; tone: ChartTone };

export type ChartPoint = { label: string; value: number };

type ChartBase = {
  /**
   * What VoiceOver and TalkBack read for the whole chart: the data in words,
   * for example "Working 32 minutes, rest 18 minutes, transitions 6 minutes".
   */
  summary: string;
  /** Plot height in points/dp; each kind has a sensible default. */
  height?: number;
};

export type ChartProps = ChartBase &
  (
    | {
        /** One bar per entry, each split into its segments. */
        kind: 'stackedBar';
        bars: { label: string; segments: ChartSegment[] }[];
        /** Horizontal bars, as on the finish screen's breakdown. */
        horizontal?: boolean;
      }
    | { kind: 'bar'; points: ChartPoint[]; tone?: ChartTone }
    | {
        /** A single series over time, oldest first. */
        kind: 'trend';
        points: ChartPoint[];
        tone?: ChartTone;
        /** A dashed rule, for example planned rest. */
        reference?: { label: string; value: number };
      }
  );
