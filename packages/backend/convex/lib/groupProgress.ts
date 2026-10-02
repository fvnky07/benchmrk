// The Group side of a member's Workout: the progress summary other members
// read, kept current by the member's own Workout mutations, and joining,
// leaving or ending a Group.
import { ConvexError, type Infer } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { groupProgressValidator } from '../schema';
import {
  findActiveWorkout,
  progressOf,
  restEndsAt,
  setsOfExercise,
  workoutExercisesOf,
} from './workoutData';

export type GroupProgress = Infer<typeof groupProgressValidator>;

/** Safety limit; Groups have no product cap. */
const MAX_MEMBERS = 20;

const NOT_STARTED: GroupProgress = {
  status: 'not_started',
  routineName: null,
  startedAt: null,
  currentExercise: null,
  setNumber: 0,
  setCount: 0,
  setsDone: 0,
  setsPlanned: 0,
  restEndsAt: null,
};

/**
 * A member's progress as their Group sees it: the active Workout's name,
 * the first unfinished Exercise and its Working Set position, Pace inputs
 * (Working Sets done of planned) and rest. Never Sets, weights or efforts.
 */
export async function progressSummary(
  ctx: QueryCtx,
  userId: string
): Promise<GroupProgress> {
  const workout = await findActiveWorkout(ctx, userId);
  if (!workout) return NOT_STARTED;
  const { done, total } = await progressOf(ctx, workout._id);

  let current: { name: string; setNumber: number; setCount: number } | null =
    null;
  for (const workoutExercise of await workoutExercisesOf(ctx, workout._id)) {
    if (workoutExercise.skipped) continue;
    const working = (await setsOfExercise(ctx, workoutExercise._id)).filter(
      (set) => set.type !== 'warmup'
    );
    const logged = working.filter((set) => set.completedAt !== undefined);
    if (logged.length < working.length) {
      const exercise = await ctx.db.get(workoutExercise.exerciseId);
      current = {
        name: exercise?.name ?? 'Exercise',
        setNumber: logged.length + 1,
        setCount: working.length,
      };
      break;
    }
  }

  const restEnd = workout.rest ? restEndsAt(workout.rest) : null;
  return {
    status:
      total > 0 && done === total
        ? 'finished'
        : restEnd !== null && restEnd > Date.now()
          ? 'resting'
          : 'working',
    routineName: workout.name,
    startedAt: workout.startedAt,
    currentExercise: current?.name ?? null,
    setNumber: current?.setNumber ?? 0,
    setCount: current?.setCount ?? 0,
    setsDone: done,
    setsPlanned: total,
    restEndsAt: restEnd,
  };
}

export async function activeMembership(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query('groupMemberships')
    .withIndex('by_user_left', (q) =>
      q.eq('userId', userId).eq('leftAt', undefined)
    )
    .first();
}

/** The member's active membership in a live Group; NOT_IN_GROUP otherwise. */
export async function requireMembership(ctx: QueryCtx, userId: string) {
  const membership = await activeMembership(ctx, userId);
  const group = membership ? await ctx.db.get(membership.groupId) : null;
  if (!membership || !group || group.status !== 'live') {
    throw new ConvexError('NOT_IN_GROUP');
  }
  return { membership, group };
}

/** Current members, longest-present first. */
export async function groupMembers(ctx: QueryCtx, group: Doc<'groups'>) {
  return ctx.db
    .query('groupMemberships')
    .withIndex('by_group_left', (q) =>
      q.eq('groupId', group._id).eq('leftAt', undefined)
    )
    .collect();
}

export async function recordGroupEvent(
  ctx: MutationCtx,
  groupId: Id<'groups'>,
  kind: Doc<'groupEvents'>['kind'],
  userId?: string
) {
  await ctx.db.insert('groupEvents', {
    groupId,
    kind,
    userId,
    at: Date.now(),
  });
}

/** Adds the member to the Group, with their current progress summary. */
export async function addMember(
  ctx: MutationCtx,
  group: Doc<'groups'>,
  userId: string
) {
  const now = Date.now();
  await ctx.db.insert('groupMemberships', {
    groupId: group._id,
    userId,
    joinedAt: now,
    lastSeenAt: now,
    progress: await progressSummary(ctx, userId),
  });
  await ctx.db.patch(group._id, { lastActivityAt: now });
  await recordGroupEvent(ctx, group._id, 'joined', userId);
}

/**
 * Joins a live Group under the join rules every route shares (code, link,
 * QR or invite): one Group at a time and the safety limit. Callers check the
 * verified email first. Joining one's own Group again is a no-op.
 */
export async function joinGroup(
  ctx: MutationCtx,
  group: Doc<'groups'>,
  userId: string
) {
  const current = await activeMembership(ctx, userId);
  if (current?.groupId === group._id) return;
  if (current) throw new ConvexError('IN_ANOTHER_GROUP');
  if ((await groupMembers(ctx, group)).length >= MAX_MEMBERS) {
    throw new ConvexError('GROUP_FULL');
  }
  await addMember(ctx, group, userId);
}

/** Rewrites the member's progress summary, in the same mutation as the change. */
export async function syncGroupProgress(ctx: MutationCtx, userId: string) {
  const membership = await activeMembership(ctx, userId);
  if (!membership) return;
  const now = Date.now();
  await ctx.db.patch(membership._id, {
    progress: await progressSummary(ctx, userId),
  });
  await ctx.db.patch(membership.groupId, { lastActivityAt: now });
}

/** Ends a Group: everyone leaves and its codes stop working. */
export async function endGroup(ctx: MutationCtx, group: Doc<'groups'>) {
  const now = Date.now();
  for (const member of await groupMembers(ctx, group)) {
    await ctx.db.patch(member._id, { leftAt: now });
  }
  const codes = await ctx.db
    .query('groupCodes')
    .withIndex('by_group', (q) => q.eq('groupId', group._id))
    .collect();
  for (const code of codes) {
    if (code.revokedAt === undefined) {
      await ctx.db.patch(code._id, { revokedAt: now });
    }
  }
  await ctx.db.patch(group._id, { status: 'ended', endedAt: now });
  await recordGroupEvent(ctx, group._id, 'ended');
}

/**
 * Takes the member out of their Group, if any. The last member out ends it;
 * a leaving host hands hosting to the longest-present member.
 */
export async function leaveGroup(
  ctx: MutationCtx,
  userId: string,
  reason: 'left' | 'dropped' = 'left'
) {
  const membership = await activeMembership(ctx, userId);
  if (!membership) return;
  const now = Date.now();
  await ctx.db.patch(membership._id, { leftAt: now });
  const group = await ctx.db.get(membership.groupId);
  if (group?.status !== 'live') return;
  await ctx.db.patch(group._id, { lastActivityAt: now });
  await recordGroupEvent(ctx, group._id, reason, userId);
  const remaining = await groupMembers(ctx, group);
  const [nextHost] = remaining;
  if (!nextHost) {
    await endGroup(ctx, group);
  } else if (group.hostId === userId) {
    await ctx.db.patch(group._id, { hostId: nextHost.userId });
    await recordGroupEvent(ctx, group._id, 'hostChanged', nextHost.userId);
  }
}
