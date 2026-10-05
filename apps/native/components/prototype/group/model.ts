// PROTOTYPE — throwaway (prototype/workout-ui branch).
// What the in-Group presentation needs from the route: data in `GroupModel`,
// every handler in `GroupActions`. Variants own no queries or mutations except
// the Group activity feed.
import type { api } from '@repo/backend/convex/_generated/api';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import type { FunctionReturnType } from 'convex/server';
import type { ReactNode } from 'react';
import { formatClock, formatWeight } from '@/lib/workout/format';

export type GroupView = NonNullable<
  FunctionReturnType<typeof api.groups.getMine>
>;
export type GroupMember = GroupView['members'][number];
export type MemberProgress = GroupMember['progress'];

export type GroupModel = Readonly<{
  group: GroupView;
  /** The viewer first, then by arrival. */
  members: readonly GroupMember[];
  now: number;
  isHost: boolean;
  /** Null while the reactions setting loads. */
  muted: boolean | null;
  showWeights: boolean;
  units: WeightUnit;
  busy: boolean;
  qrShown: boolean;
  /** The viewer's own summary; null if they are not in `members`. */
  selfProgress: MemberProgress | null;
  /** Error and email-verification rows; render inside a native Host. */
  status: ReactNode;
}>;

export type GroupActions = Readonly<{
  /** To the active Workout, or the Workout landing if none is started. */
  onBack: () => void;
  onInvite: () => void;
  onShare: () => void;
  onToggleQr: () => void;
  onRevokeCode: () => void;
  onToggleMuted: () => void;
  /** Members leave at once; the host confirms ending the Group first. */
  onLeaveOrEnd: () => void;
  onSetShowWeights: (shown: boolean) => void;
}>;

export type GroupMenuItem = Readonly<{
  key: 'share' | 'qr' | 'revoke' | 'mute' | 'leave';
  label: string;
  disabled: boolean;
  destructive: boolean;
  onPress: () => void;
}>;

export type GroupVariantProps = Readonly<{
  model: GroupModel;
  actions: GroupActions;
}>;

/** The Group menu as the same ordered, permission-aware list for any layout. */
export function groupMenu(
  model: GroupModel,
  actions: GroupActions
): GroupMenuItem[] {
  const { busy, isHost, muted, qrShown } = model;
  return [
    {
      key: 'share',
      label: 'Share code',
      disabled: busy,
      destructive: false,
      onPress: actions.onShare,
    },
    {
      key: 'qr',
      label: qrShown ? 'Hide QR' : 'Show QR',
      disabled: busy,
      destructive: false,
      onPress: actions.onToggleQr,
    },
    ...(isHost
      ? [
          {
            key: 'revoke',
            label: 'Revoke code',
            disabled: busy,
            destructive: false,
            onPress: actions.onRevokeCode,
          } as const,
        ]
      : []),
    {
      key: 'mute',
      label: muted ? 'Unmute reactions' : 'Mute reactions',
      disabled: busy || muted === null,
      destructive: false,
      onPress: actions.onToggleMuted,
    },
    {
      key: 'leave',
      label: isHost ? 'End Group' : 'Leave Group',
      disabled: busy,
      destructive: true,
      onPress: actions.onLeaveOrEnd,
    },
  ];
}

/** Planned Sets completed, 0 to 1. */
export function paceOf(progress: MemberProgress): number {
  return progress.setsPlanned === 0
    ? 0
    : Math.min(1, progress.setsDone / progress.setsPlanned);
}

export function restRemaining(
  progress: MemberProgress,
  now: number
): number | null {
  return progress.restEndsAt !== null && progress.restEndsAt > now
    ? (progress.restEndsAt - now) / 1000
    : null;
}

export function statusText(progress: MemberProgress, now: number): string {
  switch (progress.status) {
    case 'not_started':
      return 'Not started';
    case 'finished':
      return 'Finished';
    default: {
      const rest = restRemaining(progress, now);
      return rest === null ? 'Working' : `Resting ${formatClock(rest)}`;
    }
  }
}

/** "Bench press · Set 2 of 4", or null before any Exercise. */
export function exerciseLine(progress: MemberProgress): string | null {
  return progress.currentExercise && progress.setCount > 0
    ? `${progress.currentExercise} · Set ${progress.setNumber} of ${progress.setCount}`
    : progress.currentExercise;
}

/** The current Set's weight × reps, only when the member shows weights. */
export function setLine(
  progress: MemberProgress,
  units: WeightUnit
): string | null {
  if (!progress.weightsShown || !progress.currentSet) {
    return null;
  }
  const { weightKg, reps } = progress.currentSet;
  return `${weightKg === null ? 'No weight' : formatWeight(weightKg, units)} × ${reps === null ? 'No reps' : `${reps} reps`}`;
}

export function volumeLine(
  progress: MemberProgress,
  units: WeightUnit
): string | null {
  return progress.weightsShown && progress.volumeKg !== null
    ? formatWeight(progress.volumeKg, units)
    : null;
}

export function elapsedClock(
  progress: MemberProgress,
  now: number
): string | null {
  return progress.startedAt === null || progress.status === 'finished'
    ? null
    : formatClock((now - progress.startedAt) / 1000);
}

export function memberTag(member: GroupMember): string {
  if (member.isYou) {
    return member.isHost ? 'You · Group host' : 'You';
  }
  return member.isHost ? 'Group host' : 'Group member';
}

/** Members by Pace, highest first; ties keep arrival order (the viewer first). */
export function rankedByPace(
  members: readonly GroupMember[]
): readonly GroupMember[] {
  return members
    .map((member, index) => ({ member, index }))
    .sort(
      (a, b) =>
        paceOf(b.member.progress) - paceOf(a.member.progress) ||
        a.index - b.index
    )
    .map(({ member }) => member);
}
