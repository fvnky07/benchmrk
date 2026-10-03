// The Group side of a member's Workout: the progress summary other members
// read, kept current by the member's own Workout mutations, and joining,
// leaving or ending a Group.
import { ConvexError, type Infer } from 'convex/values';

import { components, internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { meetsTarget } from '../domain/overload';
import type { groupProgressValidator } from '../schema';
import { blockedEitherWayIds } from './blocks';
import { isWorkingSet } from './overload';
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

type ExerciseProgress = NonNullable<GroupProgress['exercises']>[number];

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
  exercises: [],
  currentSet: null,
  volumeKg: null,
};

/**
 * A member's progress as their Group sees it: the active Workout's name, the
 * current Exercise and its Set position, Pace inputs (Sets done of planned),
 * rest, each Exercise's Set pips and whether its Overload targets were met.
 * Weight, reps and volume only when the member shows them. Never Effort
 * ratings, notes, target values or body data.
 */
export async function progressSummary(
  ctx: QueryCtx,
  userId: string,
  showWeights: boolean
): Promise<GroupProgress> {
  const workout = await findActiveWorkout(ctx, userId);
  if (!workout) return { ...NOT_STARTED, weightsShown: showWeights };
  const { done, total } = await progressOf(ctx, workout._id);

  let current: {
    name: string;
    setNumber: number;
    setCount: number;
    set: Doc<'sets'>;
    lastLogged: Doc<'sets'> | null;
  } | null = null;
  const exercises: ExerciseProgress[] = [];
  let volumeKg = 0;
  for (const workoutExercise of await workoutExercisesOf(ctx, workout._id)) {
    if (workoutExercise.skipped) continue;
    const exercise = await ctx.db.get(workoutExercise.exerciseId);
    const name = exercise?.name ?? 'Exercise';
    const sets = await setsOfExercise(ctx, workoutExercise._id);
    const counted = sets.filter((set) => set.type !== 'warmup');
    const logged = counted.filter((set) => set.completedAt !== undefined);
    const open = counted.find((set) => set.completedAt === undefined);
    const isCurrent = current === null && open !== undefined;
    if (isCurrent) {
      current = {
        name,
        setNumber: logged.length + 1,
        setCount: counted.length,
        set: open,
        lastLogged: logged[logged.length - 1] ?? null,
      };
    }
    const targeted = sets.flatMap((set) =>
      isWorkingSet(set) && set.target ? [{ set, target: set.target }] : []
    );
    exercises.push({
      name,
      pips: counted.map((set) =>
        set.completedAt !== undefined
          ? 'done'
          : isCurrent && set._id === open?._id
            ? 'current'
            : 'upcoming'
      ),
      targetMet:
        targeted.length === 0 ||
        targeted.some(({ set }) => set.completedAt === undefined)
          ? null
          : targeted.every(({ set, target }) => meetsTarget(set, target)),
    });
    for (const set of logged) {
      if (isWorkingSet(set)) volumeKg += (set.weightKg ?? 0) * (set.reps ?? 0);
    }
  }

  // The Set they're on: what they've entered for it, else their last logged
  // Set of that Exercise. Never its target.
  const shownSet =
    current &&
    (current.set.weightKg !== undefined || current.set.reps !== undefined)
      ? current.set
      : (current?.lastLogged ?? null);
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
    exercises,
    currentSet:
      showWeights && shownSet
        ? { weightKg: shownSet.weightKg ?? null, reps: shownSet.reps ?? null }
        : null,
    volumeKg: showWeights ? volumeKg : null,
    weightsShown: showWeights,
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

/** Joins this close after the first one go out as one push. */
export const JOIN_MERGE_MS = 60_000;

/**
 * Records a Group event, its recipient-owned inbox entries and its push.
 * Joins open a push merge window; leaves and drops tell members still there.
 */
export async function recordGroupEvent(
  ctx: MutationCtx,
  groupId: Id<'groups'>,
  kind: Doc<'groupEvents'>['kind'],
  userId?: string,
  detail?: {
    exerciseName: string;
    setNumber?: number;
    targetId: Id<'sets'> | Id<'workoutExercises'>;
  }
) {
  const at = Date.now();
  const eventId = await ctx.db.insert('groupEvents', {
    groupId,
    kind,
    userId,
    at,
    ...detail,
  });
  if (
    kind === 'joined' ||
    kind === 'left' ||
    kind === 'dropped' ||
    kind === 'ended'
  ) {
    const group = await ctx.db.get(groupId);
    const members = group ? await groupMembers(ctx, group) : [];
    const actor = userId
      ? await ctx.runQuery(components.betterAuth.users.getUser, {
          userId,
        })
      : null;
    const inboxKind = kind === 'dropped' ? 'left' : kind;
    const copy =
      inboxKind === 'ended'
        ? 'Your Group ended'
        : `${actor?.username ?? 'member'} ${inboxKind === 'joined' ? 'joined your Group' : 'left'}`;
    for (const member of members) {
      if (member.userId === userId) continue;
      await ctx.db.insert('groupNotifications', {
        eventId,
        userId: member.userId,
        actorId: userId,
        kind: inboxKind,
        copy,
        createdAt: at,
      });
    }
  }
  if (kind === 'joined') {
    const recent = await ctx.db
      .query('groupEvents')
      .withIndex('by_group_at', (q) =>
        q.eq('groupId', groupId).gt('at', at - JOIN_MERGE_MS)
      )
      .collect();
    const windowOpen = recent.some(
      (event) => event.batchUntil !== undefined && event.batchUntil > at
    );
    if (!windowOpen) {
      const until = at + JOIN_MERGE_MS;
      await ctx.db.patch(eventId, { batchUntil: until });
      await ctx.scheduler.runAfter(JOIN_MERGE_MS, internal.push.sendJoins, {
        groupId,
        from: at,
        until,
      });
    }
  } else if ((kind === 'left' || kind === 'dropped') && userId) {
    const group = await ctx.db.get(groupId);
    const recipientIds = group
      ? (await groupMembers(ctx, group)).map((member) => member.userId)
      : [];
    if (recipientIds.length) {
      await ctx.scheduler.runAfter(0, internal.push.sendGroupEvent, {
        kind: 'left',
        actorId: userId,
        recipientIds,
      });
    }
  }
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
    progress: await progressSummary(ctx, userId, false),
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
  const memberships = await ctx.db
    .query('groupMemberships')
    .withIndex('by_user_left', (q) => q.eq('userId', userId))
    .collect();
  if (
    memberships.some(
      (membership) => membership.groupId === group._id && membership.removed
    )
  ) {
    throw new ConvexError('REMOVED_FROM_GROUP');
  }
  const members = await groupMembers(ctx, group);
  const blockedIds = await blockedEitherWayIds(ctx, userId);
  if (members.some((member) => blockedIds.has(member.userId))) {
    throw new ConvexError('JOIN_REFUSED');
  }
  if (members.length >= MAX_MEMBERS) {
    throw new ConvexError('GROUP_FULL');
  }
  await addMember(ctx, group, userId);
}

/** Rewrites the member's progress summary, in the same mutation as the change. */
export async function syncGroupProgress(ctx: MutationCtx, userId: string) {
  const membership = await activeMembership(ctx, userId);
  if (!membership) return;
  const now = Date.now();
  const progress = await progressSummary(
    ctx,
    userId,
    membership.showWeights ?? false
  );
  const previousExercises =
    progress.startedAt === membership.progress.startedAt
      ? (membership.progress.exercises ?? [])
      : [];
  const workout = await findActiveWorkout(ctx, userId);
  const workoutExercises = workout
    ? (await workoutExercisesOf(ctx, workout._id)).filter(
        (exercise) => !exercise.skipped
      )
    : [];
  for (const [exerciseIndex, exercise] of (
    progress.exercises ?? []
  ).entries()) {
    const previous = previousExercises.find(
      (entry) => entry.name === exercise.name
    );
    const workoutExercise = workoutExercises[exerciseIndex];
    if (!workoutExercise) continue;
    let countedSets: Doc<'sets'>[] | undefined;
    for (const [index, pip] of exercise.pips.entries()) {
      if (pip === 'done' && previous?.pips[index] !== 'done') {
        countedSets ??= (await setsOfExercise(ctx, workoutExercise._id)).filter(
          (set) => set.type !== 'warmup'
        );
        const set = countedSets[index];
        if (!set) throw new ConvexError('SET_NOT_FOUND');
        await recordGroupEvent(
          ctx,
          membership.groupId,
          'setCompleted',
          userId,
          {
            exerciseName: exercise.name,
            setNumber: index + 1,
            targetId: set._id,
          }
        );
      }
    }
    if (exercise.targetMet === true && previous?.targetMet !== true) {
      await recordGroupEvent(ctx, membership.groupId, 'targetMet', userId, {
        exerciseName: exercise.name,
        targetId: workoutExercise._id,
      });
    }
  }
  await ctx.db.patch(membership._id, { progress });
  await ctx.db.patch(membership.groupId, { lastActivityAt: now });
}

/**
 * Ends a Group: everyone leaves and its codes stop working. Everyone who was
 * in it hears it ended, except the host who ended it.
 */
export async function endGroup(
  ctx: MutationCtx,
  group: Doc<'groups'>,
  endedBy?: string
) {
  const now = Date.now();
  const members = await groupMembers(ctx, group);
  await recordGroupEvent(ctx, group._id, 'ended', endedBy);
  for (const member of members) {
    await ctx.db.patch(member._id, { leftAt: now });
  }
  const memberships = await ctx.db
    .query('groupMemberships')
    .withIndex('by_group_left', (q) => q.eq('groupId', group._id))
    .collect();
  const latestMemberships = new Map<string, Doc<'groupMemberships'>>();
  for (const membership of memberships) {
    const previous = latestMemberships.get(membership.userId);
    if (
      !previous ||
      membership.joinedAt > previous.joinedAt ||
      (membership.joinedAt === previous.joinedAt &&
        membership._creationTime > previous._creationTime)
    ) {
      latestMemberships.set(membership.userId, membership);
    }
  }
  const recapId = await ctx.db.insert('groupRecaps', {
    groupId: group._id,
    endedAt: now,
  });
  for (const member of latestMemberships.values()) {
    const profile = await ctx.runQuery(components.betterAuth.users.getUser, {
      userId: member.userId,
    });
    const { progress } = member;
    await ctx.db.insert('groupRecapRows', {
      recapId,
      groupId: group._id,
      userId: member.userId,
      username: profile?.username ?? 'member',
      setsDone: progress.setsDone,
      durationSeconds:
        progress.startedAt === null
          ? 0
          : Math.max(
              0,
              Math.floor(((member.leftAt ?? now) - progress.startedAt) / 1000)
            ),
      targetsMet:
        progress.exercises?.filter((exercise) => exercise.targetMet === true)
          .length ?? 0,
      volumeKg: progress.weightsShown ? (progress.volumeKg ?? null) : null,
      hidden: false,
    });
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
  const recipientIds = members
    .map((member) => member.userId)
    .filter((userId) => userId !== endedBy);
  if (recipientIds.length) {
    await ctx.scheduler.runAfter(0, internal.push.sendGroupEvent, {
      kind: 'ended',
      actorId: endedBy,
      recipientIds,
    });
  }
}

/**
 * Takes the member out of their Group, if any. The last member out ends it;
 * a leaving host hands hosting to the longest-present member.
 */
export async function leaveGroup(
  ctx: MutationCtx,
  userId: string,
  reason: 'left' | 'dropped' | 'removed' = 'left'
) {
  const membership = await activeMembership(ctx, userId);
  if (!membership) return;
  const now = Date.now();
  const progress = await progressSummary(
    ctx,
    userId,
    membership.showWeights ?? false
  );
  await ctx.db.patch(membership._id, { progress, leftAt: now });
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
