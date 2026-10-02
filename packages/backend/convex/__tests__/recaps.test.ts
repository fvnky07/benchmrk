import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import { IDLE_END_AFTER_MS } from '../domain/presence';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

const MINUTE = 60_000;
const GROUP_START = START + 24 * 60 * MINUTE;

beforeEach(useWorkoutClock);
afterEach(() => vi.useRealTimers());

async function member(t: TestBackend, username: string): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: true,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

async function benchRoutine(t: TestBackend, lifter: TestMember) {
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
  return routineId;
}

async function groupWithWorkouts() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const host = await member(t, 'host');
  const guest = await member(t, 'guest');
  const hostRoutineId = await benchRoutine(t, host);
  const guestRoutineId = await benchRoutine(t, guest);
  const earlierId = await guest.mutation(api.workouts.start, {
    routineId: guestRoutineId,
  });
  for (const set of (await activeWorkout(guest)).exercises[0]?.sets ?? []) {
    await guest.mutation(api.workouts.completeSet, {
      setId: set._id,
      weightKg: 60,
      reps: 6,
    });
  }
  await guest.mutation(api.workouts.end, {
    workoutId: earlierId,
    reason: 'finish',
  });

  vi.setSystemTime(GROUP_START);
  const groupId = await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  await guest.mutation(api.groups.joinByCode, { code });
  const hostWorkoutId = await host.mutation(api.workouts.start, {
    routineId: hostRoutineId,
  });
  const guestWorkoutId = await guest.mutation(api.workouts.start, {
    routineId: guestRoutineId,
  });
  const hostSets = (await activeWorkout(host)).exercises[0]?.sets;
  const guestSets = (await activeWorkout(guest)).exercises[0]?.sets;
  if (
    !hostSets ||
    !guestSets ||
    hostSets.length !== 2 ||
    guestSets.length !== 2
  ) {
    throw new Error('missing Bench Press Sets');
  }
  return {
    t,
    host,
    guest,
    groupId,
    code,
    hostWorkoutId,
    guestWorkoutId,
    hostSets,
    guestSets,
  };
}

describe('Group recaps', () => {
  test('host end saves every member, including final Sets before a Workout ends', async () => {
    const {
      t,
      host,
      guest,
      groupId,
      code,
      guestWorkoutId,
      hostSets,
      guestSets,
    } = await groupWithWorkouts();
    const waiting = await member(t, 'waiting');
    await waiting.mutation(api.groups.joinByCode, { code });
    await guest.mutation(api.groups.setShowWeights, { shown: true });
    vi.setSystemTime(GROUP_START + MINUTE);
    for (const set of guestSets) {
      await guest.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 200,
        reps: 8,
      });
    }
    vi.setSystemTime(GROUP_START + 3 * MINUTE);
    await guest.mutation(api.workouts.end, {
      workoutId: guestWorkoutId,
      reason: 'finish',
    });
    expect(
      await guest.query(api.recaps.forWorkout, { workoutId: guestWorkoutId })
    ).toBeNull();
    vi.setSystemTime(GROUP_START + 4 * MINUTE);
    const firstHostSet = hostSets[0];
    if (!firstHostSet) throw new Error('missing host Set');
    await host.mutation(api.workouts.completeSet, {
      setId: firstHostSet._id,
      weightKg: 80,
      reps: 5,
    });
    vi.setSystemTime(GROUP_START + 6 * MINUTE);
    await host.mutation(api.groups.end, {});

    const recap = await guest.query(api.recaps.get, { groupId });
    expect(recap).toMatchObject({
      groupId,
      createdAt: GROUP_START,
      endedAt: GROUP_START + 6 * MINUTE,
      rows: [
        {
          username: 'guest',
          isYou: true,
          setsDone: 2,
          durationSeconds: 180,
          targetsMet: 1,
          volumeKg: 3200,
        },
        {
          username: 'host',
          isYou: false,
          setsDone: 1,
          durationSeconds: 360,
          targetsMet: 0,
          volumeKg: null,
        },
        {
          username: 'waiting',
          isYou: false,
          setsDone: 0,
          durationSeconds: 0,
          targetsMet: 0,
          volumeKg: null,
        },
      ],
    });
    expect(
      await guest.query(api.recaps.forWorkout, { workoutId: guestWorkoutId })
    ).toBe(groupId);
    expect(recap.timeline[0]).toMatchObject({
      kind: 'joined',
      username: 'host',
      exerciseName: null,
      at: GROUP_START,
    });
    expect(recap.timeline.at(-1)).toMatchObject({
      kind: 'ended',
      at: GROUP_START + 6 * MINUTE,
    });
    expect(
      recap.timeline.some(
        (event) => event.kind === 'left' && event.username === 'guest'
      )
    ).toBe(true);
    expect(recap.timeline.map((event) => event.at)).toEqual(
      [...recap.timeline.map((event) => event.at)].sort((a, b) => a - b)
    );
  });

  test('explicit leave freezes the final summary rather than later solo Sets', async () => {
    const { host, guest, groupId, guestSets } = await groupWithWorkouts();
    const [first, second] = guestSets;
    if (!first || !second) throw new Error('missing guest Sets');
    vi.setSystemTime(GROUP_START + MINUTE);
    await guest.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 100,
      reps: 8,
    });
    vi.setSystemTime(GROUP_START + 2 * MINUTE);
    await guest.mutation(api.groups.leave, {});
    vi.setSystemTime(GROUP_START + 3 * MINUTE);
    await guest.mutation(api.workouts.completeSet, {
      setId: second._id,
      weightKg: 100,
      reps: 8,
    });
    vi.setSystemTime(GROUP_START + 4 * MINUTE);
    await host.mutation(api.groups.end, {});
    const recap = await guest.query(api.recaps.get, { groupId });
    expect(recap.rows.find((row) => row.isYou)).toMatchObject({
      setsDone: 1,
      durationSeconds: 120,
      targetsMet: 0,
      volumeKg: null,
    });
  });

  test("outsiders cannot read or hide a recap or discover another member's Workout", async () => {
    const { t, host, groupId, hostWorkoutId, hostSets } =
      await groupWithWorkouts();
    const outsider = await member(t, 'outsider');
    vi.setSystemTime(GROUP_START + MINUTE);
    const first = hostSets[0];
    if (!first) throw new Error('missing host Set');
    await host.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 80,
      reps: 5,
    });
    await host.mutation(api.groups.end, {});
    await host.mutation(api.workouts.end, {
      workoutId: hostWorkoutId,
      reason: 'terminate',
    });
    await expect(outsider.query(api.recaps.get, { groupId })).rejects.toThrow(
      'NOT_FOUND'
    );
    await expect(
      outsider.mutation(api.recaps.hide, { groupId })
    ).rejects.toThrow('NOT_FOUND');
    await expect(t.query(api.recaps.get, { groupId })).rejects.toThrow(
      'NOT_FOUND'
    );
    expect(
      await outsider.query(api.recaps.forWorkout, { workoutId: hostWorkoutId })
    ).toBeNull();
  });

  test("volume follows the member's weight visibility at the snapshot", async () => {
    const { host, guest, groupId, hostSets, guestSets } =
      await groupWithWorkouts();
    await host.mutation(api.groups.setShowWeights, { shown: true });
    await guest.mutation(api.groups.setShowWeights, { shown: true });
    vi.setSystemTime(GROUP_START + MINUTE);
    const hostSet = hostSets[0];
    const guestSet = guestSets[0];
    if (!hostSet || !guestSet) throw new Error('missing Sets');
    await host.mutation(api.workouts.completeSet, {
      setId: hostSet._id,
      weightKg: 80,
      reps: 5,
    });
    await guest.mutation(api.workouts.completeSet, {
      setId: guestSet._id,
      weightKg: 100,
      reps: 8,
    });
    await guest.mutation(api.groups.setShowWeights, { shown: false });
    await host.mutation(api.groups.end, {});
    const recap = await host.query(api.recaps.get, { groupId });
    expect(recap.rows.find((row) => row.username === 'host')?.volumeKg).toBe(
      400
    );
    expect(
      recap.rows.find((row) => row.username === 'guest')?.volumeKg
    ).toBeNull();
  });

  test("hiding affects only the hiding member's discovery, not direct access or other rows", async () => {
    const {
      host,
      guest,
      groupId,
      hostWorkoutId,
      guestWorkoutId,
      hostSets,
      guestSets,
    } = await groupWithWorkouts();
    vi.setSystemTime(GROUP_START + MINUTE);
    for (const [lifter, sets] of [
      [host, hostSets],
      [guest, guestSets],
    ] as const) {
      for (const set of sets) {
        await lifter.mutation(api.workouts.completeSet, {
          setId: set._id,
          weightKg: 100,
          reps: 8,
        });
      }
    }
    vi.setSystemTime(GROUP_START + 2 * MINUTE);
    await host.mutation(api.groups.end, {});
    await host.mutation(api.workouts.end, {
      workoutId: hostWorkoutId,
      reason: 'finish',
    });
    await guest.mutation(api.workouts.end, {
      workoutId: guestWorkoutId,
      reason: 'finish',
    });
    expect(
      await host.query(api.recaps.forWorkout, { workoutId: hostWorkoutId })
    ).toBe(groupId);
    expect(
      await guest.query(api.recaps.forWorkout, { workoutId: guestWorkoutId })
    ).toBe(groupId);
    await host.mutation(api.recaps.hide, { groupId });
    expect(
      await host.query(api.recaps.forWorkout, { workoutId: hostWorkoutId })
    ).toBeNull();
    expect(
      await guest.query(api.recaps.forWorkout, { workoutId: guestWorkoutId })
    ).toBe(groupId);
    expect(
      (await host.query(api.recaps.get, { groupId })).rows.map(
        (row) => row.username
      )
    ).toEqual(['guest', 'host']);
    expect(
      (await guest.query(api.recaps.get, { groupId })).rows.find(
        (row) => row.username === 'host'
      )?.setsDone
    ).toBe(2);
  });

  test('the idle end saves logged Sets in the same recap as a host end', async () => {
    const { t, host, groupId, hostSets } = await groupWithWorkouts();
    vi.setSystemTime(GROUP_START + MINUTE);
    const first = hostSets[0];
    if (!first) throw new Error('missing host Set');
    await host.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 80,
      reps: 5,
    });
    const endedAt = GROUP_START + MINUTE + IDLE_END_AFTER_MS;
    vi.setSystemTime(endedAt);
    await t.mutation(internal.groupSweeps.sweep, {});
    const recap = await host.query(api.recaps.get, { groupId });
    expect(recap.endedAt).toBe(endedAt);
    expect(recap.rows.find((row) => row.isYou)).toMatchObject({
      setsDone: 1,
      durationSeconds: (MINUTE + IDLE_END_AFTER_MS) / 1000,
    });
    expect(recap.timeline.at(-1)).toEqual({
      kind: 'ended',
      username: null,
      exerciseName: null,
      setNumber: null,
      at: endedAt,
    });
  });

  test('a rejoined member has one row from their latest membership and a snapshotted username', async () => {
    const { host, guest, groupId, code, guestSets } = await groupWithWorkouts();
    vi.setSystemTime(GROUP_START + MINUTE);
    await guest.mutation(api.groups.leave, {});
    vi.setSystemTime(GROUP_START + 2 * MINUTE);
    await guest.mutation(api.groups.joinByCode, { code });
    const first = guestSets[0];
    if (!first) throw new Error('missing guest Set');
    await guest.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 100,
      reps: 8,
    });
    vi.setSystemTime(GROUP_START + 3 * MINUTE);
    await host.mutation(api.groups.end, {});
    await guest.mutation(api.profile.updateProfile, { username: 'renamed' });
    const recap = await guest.query(api.recaps.get, { groupId });
    expect(recap.rows).toEqual([
      {
        username: 'guest',
        isYou: true,
        setsDone: 1,
        durationSeconds: 180,
        targetsMet: 0,
        volumeKg: null,
      },
      {
        username: 'host',
        isYou: false,
        setsDone: 0,
        durationSeconds: 180,
        targetsMet: 0,
        volumeKg: null,
      },
    ]);
    expect(
      recap.timeline
        .filter((event) => event.kind === 'joined')
        .map((event) => event.username)
    ).toEqual(['host', 'guest', 'guest']);
  });
});
