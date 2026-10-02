import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/** How many recent Workouts a target duration looks at. */
const RECENT_WORKOUTS = 5;

/**
 * Durations, in seconds and newest first, of a Routine's last completed
 * Workouts that started before `before`.
 */
export async function recentDurations(
  ctx: QueryCtx,
  routineId: Id<'routines'>,
  before: number
): Promise<number[]> {
  const workouts = await ctx.db
    .query('workouts')
    .withIndex('by_routine_status', (q) =>
      q
        .eq('routineId', routineId)
        .eq('status', 'completed')
        .lt('startedAt', before)
    )
    .order('desc')
    .take(RECENT_WORKOUTS);
  return workouts.map((workout) =>
    Math.round(
      ((workout.finishedAt ?? workout.startedAt) - workout.startedAt) / 1000
    )
  );
}
