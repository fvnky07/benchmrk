import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
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

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function backend() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  return t;
}

/** A member with a verified email (unless asked otherwise) and a username. */
async function member(
  t: TestBackend,
  username: string,
  { verified = true }: { verified?: boolean } = {}
): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: verified,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

async function hostWithCode(t: TestBackend) {
  const host = await member(t, 'host');
  await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  return { host, code };
}

async function startBenchWorkout(t: TestBackend, someone: TestMember) {
  const routineId = await someone.mutation(api.routines.create, {
    name: 'Push',
  });
  await someone.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await someone.mutation(api.workouts.start, { routineId });
  return activeWorkout(someone);
}

describe('Groups', () => {
  test('creating and joining need a verified email', async () => {
    const t = await backend();
    const { code } = await hostWithCode(t);
    const unverified = await member(t, 'newbie', { verified: false });

    await expect(unverified.mutation(api.groups.create, {})).rejects.toThrow(
      'EMAIL_NOT_VERIFIED'
    );
    await expect(
      unverified.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('EMAIL_NOT_VERIFIED');
  });

  test('a member is in one Group at a time', async () => {
    const t = await backend();
    const { host, code } = await hostWithCode(t);
    const other = await member(t, 'other');
    await other.mutation(api.groups.create, {});

    await expect(host.mutation(api.groups.create, {})).rejects.toThrow(
      'IN_ANOTHER_GROUP'
    );
    await expect(
      other.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('IN_ANOTHER_GROUP');
  });

  test('a Group holds at most 20 members', async () => {
    const t = await backend();
    const { code } = await hostWithCode(t);
    for (let index = 1; index < 20; index += 1) {
      await (await member(t, `lifter${index}`)).mutation(
        api.groups.joinByCode,
        {
          code,
        }
      );
    }

    await expect(
      (await member(t, 'one_too_many')).mutation(api.groups.joinByCode, {
        code,
      })
    ).rejects.toThrow('GROUP_FULL');
  });

  test('the host can revoke a code, and codes expire after 24 hours unused', async () => {
    const t = await backend();
    const { host, code } = await hostWithCode(t);
    const guest = await member(t, 'guest');

    await expect(guest.mutation(api.groups.revokeCode, {})).rejects.toThrow(
      'NOT_IN_GROUP'
    );
    await host.mutation(api.groups.revokeCode, {});
    await expect(
      guest.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');

    const { code: fresh } = await host.mutation(api.groups.shareCode, {});
    vi.setSystemTime(START + 24 * 60 * 60 * 1000 + 1);
    await expect(
      guest.mutation(api.groups.joinByCode, { code: fresh })
    ).rejects.toThrow('CODE_INVALID');
  });

  test('an ended Group can’t be joined', async () => {
    const t = await backend();
    const { host, code } = await hostWithCode(t);

    await host.mutation(api.groups.end, {});

    await expect(
      (await member(t, 'late')).mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');
    expect(await host.query(api.groups.getMine, {})).toBeNull();
  });

  test('leaving keeps your Workout; finishing it takes you out; hosting passes on', async () => {
    const t = await backend();
    const { host, code } = await hostWithCode(t);
    const pat = await member(t, 'pat');
    const sam = await member(t, 'sam');
    await pat.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 1000);
    await sam.mutation(api.groups.joinByCode, { code });
    const workout = await startBenchWorkout(t, pat);

    await pat.mutation(api.groups.leave, {});
    expect(await pat.query(api.groups.getMine, {})).toBeNull();
    expect(await pat.query(api.workouts.getActive, {})).not.toBeNull();

    await pat.mutation(api.groups.joinByCode, { code });
    await pat.mutation(api.workouts.end, {
      workoutId: workout._id,
      reason: 'terminate',
    });
    expect(await pat.query(api.groups.getMine, {})).toBeNull();

    await host.mutation(api.groups.leave, {});
    const view = await sam.query(api.groups.getMine, {});
    expect(view?.members.find((box) => box.isYou)?.isHost).toBe(true);

    await sam.mutation(api.groups.leave, {});
    await expect(
      (await member(t, 'after')).mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');
  });

  test('others see only your progress summary, and Pace counts Working Sets only', async () => {
    const t = await backend();
    const { host, code } = await hostWithCode(t);
    const pat = await member(t, 'pat');
    await pat.mutation(api.groups.joinByCode, { code });
    const workout = await startBenchWorkout(t, pat);
    const bench = workout.exercises[0];
    await pat.mutation(api.workouts.addSet, {
      workoutExerciseId: bench?._id as Id<'workoutExercises'>,
      type: 'warmup',
    });
    const withWarmup = await activeWorkout(pat);
    for (const set of withWarmup.exercises[0]?.sets.slice(0, 2) ?? []) {
      await pat.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 100,
        reps: 5,
      });
    }

    const view = await host.query(api.groups.getMine, {});
    const box = view?.members.find((item) => item.username === 'pat');
    expect(box).toEqual({
      username: 'pat',
      image: null,
      isYou: false,
      isHost: false,
      joinedAt: expect.any(Number),
      lastSeenAt: START,
      presence: 'active',
      progress: {
        status: 'resting',
        routineName: 'Push',
        startedAt: START,
        currentExercise: 'Bench Press',
        setNumber: 2,
        setCount: 3,
        setsDone: 1,
        setsPlanned: 3,
        restEndsAt: expect.any(Number),
        exercises: [
          {
            name: 'Bench Press',
            pips: ['done', 'current', 'upcoming'],
            targetMet: null,
          },
        ],
        currentSet: null,
        volumeKg: null,
        weightsShown: false,
      },
    });
    expect(JSON.stringify(view)).not.toMatch(/weightKg|reps|workoutId|"sets"/);
    expect(view?.members[0]?.isYou).toBe(true);
  });
});
