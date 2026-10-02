import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { createTest, type TestMember, verifiedMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

const TODAY = START + 24 * 60 * 60 * 1000;

beforeEach(useWorkoutClock);
afterEach(() => vi.useRealTimers());

/** Today's two Sets have saved targets from an earlier Workout. */
async function groupWithLifter() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const host = await verifiedMember(t, 'host');
  const lifter = await verifiedMember(t, 'lifter');
  const routineId = await lifter.mutation(api.routines.create, {
    name: 'Push',
  });
  const routineExerciseId = await lifter.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await lifter.mutation(api.routines.updateExercise, {
    routineExerciseId,
    targetSets: 2,
    repRangeMin: 4,
    repRangeMax: 8,
  });
  const earlier = await lifter.mutation(api.workouts.start, { routineId });
  for (const set of (await activeWorkout(lifter)).exercises[0]?.sets ?? []) {
    await lifter.mutation(api.workouts.completeSet, {
      setId: set._id,
      weightKg: 60,
      reps: 6,
    });
  }
  await lifter.mutation(api.workouts.end, {
    workoutId: earlier,
    reason: 'finish',
  });

  vi.setSystemTime(TODAY);
  await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  await lifter.mutation(api.groups.joinByCode, { code });
  await lifter.mutation(api.workouts.start, { routineId });
  const [first, second] =
    (await activeWorkout(lifter)).exercises[0]?.sets ?? [];
  if (!first?.target || !second?.target) throw new Error('no targets');
  return { t, host, lifter, code, first, second };
}

async function logSet(lifter: TestMember, setId: Id<'sets'>) {
  await lifter.mutation(api.workouts.completeSet, {
    setId,
    weightKg: 200,
    reps: 8,
  });
}

async function completedEvent(viewer: TestMember) {
  const event = (await viewer.query(api.groups.events, {})).find(
    (candidate) => candidate.kind === 'setCompleted'
  );
  if (!event) throw new Error('no completed Set event');
  return event;
}

describe('Group fist bumps', () => {
  test('logging a Set emits its Exercise and 1-based Set number for other members', async () => {
    const { host, lifter, first } = await groupWithLifter();
    vi.setSystemTime(TODAY + 1000);
    await logSet(lifter, first._id);

    const event = await completedEvent(host);
    expect(event).toEqual({
      eventId: expect.any(String),
      kind: 'setCompleted',
      username: 'lifter',
      isYou: false,
      exerciseName: 'Bench Press',
      setNumber: 1,
      reacted: false,
      at: TODAY + 1000,
    });
    expect(await completedEvent(lifter)).toEqual({ ...event, isYou: true });
    expect(
      (await host.query(api.groups.events, {})).filter(
        (candidate) => candidate.kind === 'targetMet'
      )
    ).toEqual([]);

    await lifter.mutation(api.groups.setShowWeights, { shown: true });
    await lifter.mutation(api.workouts.uncompleteSet, { setId: first._id });
    expect(
      (await host.query(api.groups.events, {})).filter(
        (candidate) =>
          candidate.kind === 'setCompleted' || candidate.kind === 'targetMet'
      )
    ).toEqual([event]);
  });

  test('meeting all saved targets emits one targetMet event', async () => {
    const { host, lifter, first, second } = await groupWithLifter();
    vi.setSystemTime(TODAY + 1000);
    await logSet(lifter, first._id);
    vi.setSystemTime(TODAY + 2000);
    await logSet(lifter, second._id);

    const events = await host.query(api.groups.events, {});
    const target = events.find((event) => event.kind === 'targetMet');
    expect(target).toEqual({
      eventId: expect.any(String),
      kind: 'targetMet',
      username: 'lifter',
      isYou: false,
      exerciseName: 'Bench Press',
      setNumber: null,
      reacted: false,
      at: TODAY + 2000,
    });
    expect(
      events
        .filter((event) => event.kind === 'setCompleted')
        .map((event) => event.setNumber)
    ).toEqual([2, 1]);
    await lifter.mutation(api.groups.setShowWeights, { shown: true });
    expect(
      (await host.query(api.groups.events, {})).filter(
        (event) => event.kind === 'targetMet'
      )
    ).toEqual([target]);
    if (!target) throw new Error('no target event');
    await host.mutation(api.reactions.fistBump, { eventId: target.eventId });
    expect((await lifter.query(api.reactions.mine, {})).received).toEqual([
      {
        reactionId: expect.any(String),
        fromUsername: 'host',
        eventKind: 'targetMet',
        exerciseName: 'Bench Press',
        setNumber: null,
        at: TODAY + 2000,
      },
    ]);
  });

  test('a member cannot react to their own completed Set', async () => {
    const { lifter, first } = await groupWithLifter();
    await logSet(lifter, first._id);
    const { eventId } = await completedEvent(lifter);
    await expect(
      lifter.mutation(api.reactions.fistBump, { eventId })
    ).rejects.toThrow('OWN_EVENT');
    expect((await lifter.query(api.reactions.mine, {})).received).toEqual([]);
  });

  test('repeat fist bumps are no-ops and reacted is specific to the sender', async () => {
    const { t, host, lifter, code, first } = await groupWithLifter();
    const guest = await verifiedMember(t, 'guest');
    await guest.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(TODAY + 1000);
    await logSet(lifter, first._id);
    const { eventId } = await completedEvent(host);
    vi.setSystemTime(TODAY + 2000);
    await host.mutation(api.reactions.fistBump, { eventId });
    vi.setSystemTime(TODAY + 3000);
    await host.mutation(api.reactions.fistBump, { eventId });

    const received = (await lifter.query(api.reactions.mine, {})).received;
    expect(received).toEqual([
      {
        reactionId: expect.any(String),
        fromUsername: 'host',
        eventKind: 'setCompleted',
        exerciseName: 'Bench Press',
        setNumber: 1,
        at: TODAY + 2000,
      },
    ]);
    expect((await completedEvent(host)).reacted).toBe(true);
    expect((await completedEvent(guest)).reacted).toBe(false);
    await guest.mutation(api.reactions.fistBump, { eventId });
    expect((await lifter.query(api.reactions.mine, {})).received).toEqual([
      {
        reactionId: expect.any(String),
        fromUsername: 'guest',
        eventKind: 'setCompleted',
        exerciseName: 'Bench Press',
        setNumber: 1,
        at: TODAY + 3000,
      },
      ...received,
    ]);
  });

  test('events before joining and events from another Group are not found', async () => {
    const { t, host, lifter, code, first } = await groupWithLifter();
    vi.setSystemTime(TODAY + 1000);
    await logSet(lifter, first._id);
    const { eventId } = await completedEvent(host);
    const late = await verifiedMember(t, 'late');
    vi.setSystemTime(TODAY + 2000);
    await late.mutation(api.groups.joinByCode, { code });
    await expect(
      late.mutation(api.reactions.fistBump, { eventId })
    ).rejects.toThrow('EVENT_NOT_FOUND');
    expect(await late.query(api.groups.events, {})).not.toContainEqual(
      expect.objectContaining({ eventId })
    );
    await late.mutation(api.groups.leave, {});
    await late.mutation(api.groups.create, {});
    await expect(
      late.mutation(api.reactions.fistBump, { eventId })
    ).rejects.toThrow('EVENT_NOT_FOUND');
  });

  test('muting suppresses delivery permanently without hiding earlier deliveries', async () => {
    const { host, lifter, first, second } = await groupWithLifter();
    vi.setSystemTime(TODAY + 1000);
    await logSet(lifter, first._id);
    const firstEvent = await completedEvent(host);
    await lifter.mutation(api.reactions.setMuted, { muted: true });
    await host.mutation(api.reactions.fistBump, {
      eventId: firstEvent.eventId,
    });
    expect(await lifter.query(api.reactions.mine, {})).toEqual({
      muted: true,
      received: [],
    });
    await lifter.mutation(api.reactions.setMuted, { muted: false });
    await host.mutation(api.reactions.fistBump, {
      eventId: firstEvent.eventId,
    });
    expect(await lifter.query(api.reactions.mine, {})).toEqual({
      muted: false,
      received: [],
    });

    vi.setSystemTime(TODAY + 2000);
    await logSet(lifter, second._id);
    const secondEvent = await completedEvent(host);
    await host.mutation(api.reactions.fistBump, {
      eventId: secondEvent.eventId,
    });
    const delivered = (await lifter.query(api.reactions.mine, {})).received;
    expect(delivered).toEqual([
      {
        reactionId: expect.any(String),
        fromUsername: 'host',
        eventKind: 'setCompleted',
        exerciseName: 'Bench Press',
        setNumber: 2,
        at: TODAY + 2000,
      },
    ]);
    await lifter.mutation(api.reactions.setMuted, { muted: true });
    expect(await lifter.query(api.reactions.mine, {})).toEqual({
      muted: true,
      received: delivered,
    });
  });

  test('fist bumps to a departed member stay undelivered after rejoining', async () => {
    const { host, lifter, code, first } = await groupWithLifter();
    await logSet(lifter, first._id);
    const { eventId } = await completedEvent(host);
    vi.setSystemTime(TODAY + 1000);
    await lifter.mutation(api.groups.leave, {});
    await host.mutation(api.reactions.fistBump, { eventId });
    await lifter.mutation(api.groups.joinByCode, { code });
    expect(await lifter.query(api.reactions.mine, {})).toEqual({
      muted: false,
      received: [],
    });
    expect((await completedEvent(host)).reacted).toBe(true);
  });

  test('only reactable events in a live Group can be bumped or muted', async () => {
    const { host, lifter, first } = await groupWithLifter();
    const joined = (await host.query(api.groups.events, {})).find(
      (event) => event.kind === 'joined' && event.username === 'lifter'
    );
    if (!joined) throw new Error('no join event');
    await expect(
      host.mutation(api.reactions.fistBump, { eventId: joined.eventId })
    ).rejects.toThrow('NOT_REACTABLE');
    await logSet(lifter, first._id);
    const { eventId } = await completedEvent(host);
    await host.mutation(api.groups.end, {});
    await expect(
      host.mutation(api.reactions.fistBump, { eventId })
    ).rejects.toThrow('NOT_IN_GROUP');
    await expect(
      host.mutation(api.reactions.setMuted, { muted: true })
    ).rejects.toThrow('NOT_IN_GROUP');
    expect(await host.query(api.reactions.mine, {})).toEqual({
      muted: false,
      received: [],
    });
  });
});
