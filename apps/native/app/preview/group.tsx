// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The in-Group variants with a sample Group, so they can be compared without
// being in a real Group. Open on the phone: native://preview/group?variant=B
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { type ComponentType, useState } from 'react';
import {
  type GroupEvent,
  GroupFeedPreview,
} from '@/components/prototype/group/activity';
import type {
  GroupActions,
  GroupMember,
  GroupModel,
  GroupVariantProps,
  GroupView,
} from '@/components/prototype/group/model';
import { VariantCurrent } from '@/components/prototype/group/variant-current';
import { VariantLeaderboard } from '@/components/prototype/group/variant-leaderboard';
import { VariantSpotlight } from '@/components/prototype/group/variant-spotlight';
import { VariantTiles } from '@/components/prototype/group/variant-tiles';
import {
  PrototypeVariants,
  useVariant,
} from '@/components/prototype/variant-switcher';

const GROUP_VARIANTS = [
  { key: 'A', name: 'Current' },
  { key: 'B', name: 'Leaderboard' },
  { key: 'C', name: 'Tiles' },
  { key: 'D', name: 'Spotlight' },
] as const;

const PRESENTATIONS: Record<string, ComponentType<GroupVariantProps>> = {
  A: VariantCurrent,
  B: VariantLeaderboard,
  C: VariantTiles,
  D: VariantSpotlight,
};

const MINUTE = 60_000;

type Pip = 'done' | 'current' | 'upcoming';

function pips(done: number, total: number, current: boolean): Pip[] {
  return Array.from({ length: total }, (_, i) =>
    i < done ? 'done' : i === done && current ? 'current' : 'upcoming'
  );
}

function member(
  now: number,
  username: string,
  options: Readonly<{
    isYou?: boolean;
    isHost?: boolean;
    status: GroupMember['progress']['status'];
    exercise: string | null;
    setNumber: number;
    setCount: number;
    setsDone: number;
    startedMinutesAgo: number;
    restSeconds?: number;
    weightKg?: number;
    reps?: number;
    volumeKg?: number;
    exercises: GroupMember['progress']['exercises'];
  }>
): GroupMember {
  return {
    username,
    image: null,
    isYou: options.isYou ?? false,
    isHost: options.isHost ?? false,
    joinedAt: now - 50 * MINUTE,
    lastSeenAt: now - 10_000,
    presence: 'active',
    progress: {
      status: options.status,
      routineName: 'Upper A',
      startedAt:
        options.status === 'not_started'
          ? null
          : now - options.startedMinutesAgo * MINUTE,
      currentExercise: options.exercise,
      setNumber: options.setNumber,
      setCount: options.setCount,
      setsDone: options.setsDone,
      setsPlanned: 16,
      restEndsAt: options.restSeconds ? now + options.restSeconds * 1000 : null,
      exercises: options.exercises,
      currentSet:
        options.weightKg === undefined
          ? null
          : { weightKg: options.weightKg, reps: options.reps ?? null },
      volumeKg: options.volumeKg ?? null,
      weightsShown: options.weightKg !== undefined,
    },
  };
}

function sampleGroup(now: number): GroupView {
  const upper = (
    done: number[],
    current: number
  ): GroupMember['progress']['exercises'] =>
    ['Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown'].map(
      (name, i) => ({
        name,
        pips: pips(done[i] ?? 0, 4, i === current),
        targetMet: (done[i] ?? 0) === 4 ? i !== 1 : null,
      })
    );
  return {
    createdAt: now - 52 * MINUTE,
    isHost: true,
    showWeights: true,
    members: [
      member(now, 'fvnky', {
        isYou: true,
        isHost: true,
        status: 'working',
        exercise: 'Overhead Press',
        setNumber: 2,
        setCount: 4,
        setsDone: 9,
        startedMinutesAgo: 41,
        weightKg: 50,
        reps: 8,
        volumeKg: 6120,
        exercises: upper([4, 4, 1, 0], 2),
      }),
      member(now, 'maya', {
        status: 'resting',
        exercise: 'Lat Pulldown',
        setNumber: 1,
        setCount: 4,
        setsDone: 12,
        startedMinutesAgo: 47,
        restSeconds: 74,
        weightKg: 55,
        reps: 10,
        volumeKg: 7480,
        exercises: upper([4, 4, 4, 0], 3),
      }),
      member(now, 'jordan', {
        status: 'working',
        exercise: 'Barbell Row',
        setNumber: 3,
        setCount: 4,
        setsDone: 6,
        startedMinutesAgo: 33,
        exercises: upper([4, 2, 0, 0], 1),
      }),
      member(now, 'sam_lifts', {
        status: 'finished',
        exercise: null,
        setNumber: 4,
        setCount: 4,
        setsDone: 16,
        startedMinutesAgo: 58,
        volumeKg: 9210,
        weightKg: 60,
        reps: 6,
        exercises: upper([4, 4, 4, 4], -1),
      }),
      member(now, 'alex', {
        status: 'not_started',
        exercise: null,
        setNumber: 0,
        setCount: 0,
        setsDone: 0,
        startedMinutesAgo: 0,
        exercises: [],
      }),
    ],
  };
}

function sampleEvents(now: number): GroupEvent[] {
  const event = (
    id: string,
    kind: GroupEvent['kind'],
    username: string,
    minutesAgo: number,
    exerciseName: string | null = null,
    setNumber: number | null = null,
    reacted = false
  ): GroupEvent => ({
    eventId: id as Id<'groupEvents'>,
    kind,
    username,
    isYou: username === 'fvnky',
    exerciseName,
    setNumber,
    reacted,
    at: now - minutesAgo * MINUTE,
  });
  return [
    event('e1', 'setCompleted', 'maya', 0.5, 'Lat Pulldown', 4),
    event('e2', 'targetMet', 'jordan', 2, 'Bench Press', null, true),
    event('e3', 'setCompleted', 'fvnky', 3, 'Overhead Press', 1),
    event('e4', 'setCompleted', 'sam_lifts', 6, 'Lat Pulldown', 4),
    event('e5', 'joined', 'alex', 9),
    event('e6', 'targetMet', 'maya', 14, 'Barbell Row', null),
  ];
}

export default function GroupPreview() {
  const [now] = useState(() => Date.now());
  const [group, setGroup] = useState(() => sampleGroup(now));
  const [events] = useState(() => sampleEvents(now));
  const [muted, setMuted] = useState(false);
  const [qrShown, setQrShown] = useState(false);
  const variant = useVariant(GROUP_VARIANTS);
  const Presentation = PRESENTATIONS[variant] ?? VariantCurrent;

  const model: GroupModel = {
    group,
    members: group.members,
    now,
    isHost: group.isHost,
    muted,
    showWeights: group.showWeights,
    units: 'kg',
    busy: false,
    qrShown,
    selfProgress: group.members[0]?.progress ?? null,
    status: null,
  };

  const actions: GroupActions = {
    onBack: () => {},
    onInvite: () => {},
    onShare: () => {},
    onToggleQr: () => setQrShown((shown) => !shown),
    onRevokeCode: () => {},
    onToggleMuted: () => setMuted((value) => !value),
    onLeaveOrEnd: () => {},
    onSetShowWeights: (shown) =>
      setGroup((current) => ({ ...current, showWeights: shown })),
  };

  return (
    <GroupFeedPreview.Provider value={events}>
      <PrototypeVariants variants={GROUP_VARIANTS}>
        <Presentation actions={actions} model={model} />
      </PrototypeVariants>
    </GroupFeedPreview.Provider>
  );
}
