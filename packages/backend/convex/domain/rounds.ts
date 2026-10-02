// The Alternating sets round engine. The backend runs it in mutations and the
// app reuses it for optimistic updates, so both always agree.

/** A round: one Set of every block Exercise that still has Sets left. */
export type Round<Id extends string> = {
  number: number;
  required: Id[];
  done: Id[];
  /** Deferred with Skip for now; still pending. */
  skipped: Id[];
};

/** An Exercise of the Workout, in Workout order. */
export type RoundExercise<Id extends string> = {
  id: Id;
  /** Its Alternating sets block; null when it stands alone. */
  blockId: string | null;
  /** Planned non-warm-up Sets not logged yet (none when skipped). */
  setsLeft: number;
  /** Logged non-warm-up Sets. */
  setsDone: number;
};

export type AfterSet<Id extends string> = {
  /** The block's open round now; null when it closed or the Exercise stands alone. */
  round: Round<Id> | null;
  /** The round this Set completed, to record. */
  completedRound: Round<Id> | null;
  /** Whose planned rest starts; null within a round or when nothing is left. */
  rest: 'block' | 'exercise' | null;
  /** The Exercise to show next; null when nothing is left. */
  next: Id | null;
};

const without = <Id extends string>(ids: Id[], id: Id) =>
  ids.filter((item) => item !== id);

const withId = <Id extends string>(ids: Id[], id: Id) =>
  ids.includes(id) ? ids : [...ids, id];

/** The block's members in Workout order; a block needs at least two. */
export function blockMembers<Id extends string>(
  exercises: readonly RoundExercise<Id>[],
  blockId: string | null
): RoundExercise<Id>[] {
  if (blockId === null) return [];
  const members = exercises.filter((item) => item.blockId === blockId);
  return members.length > 1 ? members : [];
}

/** The open round, or the one the next Set of the block opens. */
export function currentRound<Id extends string>(
  members: readonly RoundExercise<Id>[],
  open: Round<Id> | null
): Round<Id> | null {
  if (open) return open;
  const required = members.filter((member) => member.setsLeft > 0);
  if (required.length === 0) return null;
  return {
    number: 1 + Math.min(...required.map((member) => member.setsDone)),
    required: required.map((member) => member.id),
    done: [],
    skipped: [],
  };
}

/** The next Exercise after `fromId`, wrapping around, that still has Sets. */
export function nextWithSets<Id extends string>(
  exercises: readonly RoundExercise<Id>[],
  fromId: Id
): Id | null {
  const at = exercises.findIndex((item) => item.id === fromId);
  for (let step = 1; step <= exercises.length; step += 1) {
    const candidate = exercises[(at + step) % exercises.length];
    if (candidate && candidate.setsLeft > 0) return candidate.id;
  }
  return null;
}

/**
 * The next pending Exercise of the round after `fromId`, preferring ones not
 * skipped for now; returning to a skipped one clears its skip.
 */
function nextInRound<Id extends string>(
  members: readonly RoundExercise<Id>[],
  round: Round<Id>,
  fromId: Id
): { round: Round<Id>; next: Id | null } {
  const at = members.findIndex((member) => member.id === fromId);
  const sequence = members.map(
    (_, step) => members[(at + 1 + step) % members.length]?.id
  );
  const pending = sequence.filter(
    (id): id is Id =>
      id !== undefined &&
      round.required.includes(id) &&
      !round.done.includes(id)
  );
  const ready = pending.find((id) => !round.skipped.includes(id));
  if (ready) return { round, next: ready };
  const back = pending[0];
  if (back) {
    return {
      round: { ...round, skipped: without(round.skipped, back) },
      next: back,
    };
  }
  return { round, next: null };
}

/**
 * After a Set of `completedId` is logged. `exercises` already counts it.
 * A round completes when every required Exercise has done its Set; rest then
 * starts with the block's planned rest. A Set of a standalone Exercise starts
 * its own rest. Nothing starts rest once every planned Set is done.
 */
export function afterSet<Id extends string>({
  exercises,
  completedId,
  open,
  warmup,
  autoAdvance,
}: {
  exercises: readonly RoundExercise<Id>[];
  completedId: Id;
  /** The block's open round before this Set. */
  open: Round<Id> | null;
  /** Warm-up Sets come before the rounds and never count toward them. */
  warmup: boolean;
  autoAdvance: boolean;
}): AfterSet<Id> {
  const completed = exercises.find((item) => item.id === completedId);
  const members = blockMembers(exercises, completed?.blockId ?? null);
  const anythingLeft = exercises.some((item) => item.setsLeft > 0);

  if (members.length > 0) {
    if (warmup) {
      return {
        round: open,
        completedRound: null,
        rest: null,
        next: completedId,
      };
    }
    // A Set with no open round opens one, counted as before it was logged.
    const beforeThisSet = members.map((member) =>
      member.id === completedId
        ? {
            ...member,
            setsLeft: member.setsLeft + 1,
            setsDone: member.setsDone - 1,
          }
        : member
    );
    const started = currentRound(beforeThisSet, open) ?? {
      number: 1,
      required: [],
      done: [],
      skipped: [],
    };
    const round: Round<Id> = {
      ...started,
      required: withId(started.required, completedId),
      done: withId(started.done, completedId),
      skipped: without(started.skipped, completedId),
    };
    if (round.required.every((id) => round.done.includes(id))) {
      const lastMember = members.at(-1)?.id ?? completedId;
      return {
        round: null,
        completedRound: round,
        rest: anythingLeft ? 'block' : null,
        next:
          members.find((member) => member.setsLeft > 0)?.id ??
          nextWithSets(exercises, lastMember),
      };
    }
    if (!autoAdvance) {
      return { round, completedRound: null, rest: null, next: completedId };
    }
    const advanced = nextInRound(members, round, completedId);
    return {
      round: advanced.round,
      completedRound: null,
      rest: null,
      next: advanced.next,
    };
  }

  return {
    round: null,
    completedRound: null,
    rest: anythingLeft ? 'exercise' : null,
    next:
      (completed?.setsLeft ?? 0) > 0
        ? completedId
        : nextWithSets(exercises, completedId),
  };
}

/**
 * Skip for now: defers an Exercise without logging. In a block the round
 * stays open and moves on; null when nothing else in the round is pending.
 * A standalone Exercise moves to the next one with Sets; null when none.
 */
export function skipForNow<Id extends string>({
  exercises,
  skippedId,
  open,
}: {
  exercises: readonly RoundExercise<Id>[];
  skippedId: Id;
  open: Round<Id> | null;
}): { round: Round<Id> | null; next: Id } | null {
  const skipped = exercises.find((item) => item.id === skippedId);
  const members = blockMembers(exercises, skipped?.blockId ?? null);
  if (members.length === 0) {
    const next = nextWithSets(exercises, skippedId);
    return next === null || next === skippedId ? null : { round: null, next };
  }
  const round = currentRound(members, open);
  if (!round?.required.includes(skippedId) || round.done.includes(skippedId)) {
    return null;
  }
  const others = round.required.filter(
    (id) =>
      id !== skippedId &&
      !round.done.includes(id) &&
      !round.skipped.includes(id)
  );
  if (others.length === 0) return null;
  const deferred = { ...round, skipped: withId(round.skipped, skippedId) };
  const advanced = nextInRound(members, deferred, skippedId);
  return advanced.next === null
    ? null
    : { round: advanced.round, next: advanced.next };
}

/** An Exercise linked into a block joins its open round as pending. */
export function joinRound<Id extends string>(
  open: Round<Id> | null,
  joining: RoundExercise<Id>
): Round<Id> | null {
  if (!open || joining.setsLeft === 0) return open;
  return { ...open, required: withId(open.required, joining.id) };
}

/**
 * After the block changed (an unlink, or a member's Sets deleted or skipped),
 * the open round keeps only members that did their Set or still owe one. If
 * everyone left has done theirs, the round is credited, but an edit never
 * starts rest. `members` is the block now, as `blockMembers` returns it.
 */
export function settleRound<Id extends string>(
  open: Round<Id> | null,
  members: readonly RoundExercise<Id>[]
): { round: Round<Id> | null; completedRound: Round<Id> | null } {
  if (!open || members.length === 0) {
    return { round: null, completedRound: null };
  }
  const stays = (id: Id) => {
    const member = members.find((item) => item.id === id);
    return (
      member !== undefined && (open.done.includes(id) || member.setsLeft > 0)
    );
  };
  const round = {
    ...open,
    required: open.required.filter(stays),
    done: open.done.filter(stays),
    skipped: open.skipped.filter(stays),
  };
  if (round.required.length === 0) return { round: null, completedRound: null };
  if (round.required.every((id) => round.done.includes(id))) {
    return { round: null, completedRound: round };
  }
  return { round, completedRound: null };
}

/**
 * Unchecking a Set takes back its round credit: out of the open round, or the
 * last completed round reopens when no newer round has started. Rest already
 * started stays.
 */
export function uncheckRound<Id extends string>(
  open: Round<Id> | null,
  lastCompleted: Round<Id> | null,
  uncheckedId: Id
): { round: Round<Id> | null; reopened: boolean } {
  if (open) {
    return {
      round: { ...open, done: without(open.done, uncheckedId) },
      reopened: false,
    };
  }
  if (lastCompleted?.done.includes(uncheckedId)) {
    return {
      round: {
        ...lastCompleted,
        done: without(lastCompleted.done, uncheckedId),
      },
      reopened: true,
    };
  }
  return { round: null, reopened: false };
}

/**
 * Keeps every block together in Workout or Routine order: each block's
 * members gather where its first member stands, keeping their own order.
 */
export function gatherBlocks<Item>(
  ordered: readonly Item[],
  blockOf: (item: Item) => string | undefined
): Item[] {
  const placed = new Set<Item>();
  const result: Item[] = [];
  for (const item of ordered) {
    if (placed.has(item)) continue;
    const blockId = blockOf(item);
    const together =
      blockId === undefined
        ? [item]
        : ordered.filter((other) => blockOf(other) === blockId);
    for (const member of together) {
      placed.add(member);
      result.push(member);
    }
  }
  return result;
}

/** Where an Exercise joining or leaving a block goes: right after its last member. */
export function afterBlock<Item>(
  ordered: readonly Item[],
  blockOf: (item: Item) => string | undefined,
  blockId: string,
  moving: Item
): Item[] {
  const rest = ordered.filter((item) => item !== moving);
  let last = -1;
  rest.forEach((item, index) => {
    if (blockOf(item) === blockId) last = index;
  });
  return [...rest.slice(0, last + 1), moving, ...rest.slice(last + 1)];
}
