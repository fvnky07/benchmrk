import type { Doc } from '@repo/backend/convex/_generated/dataModel';

export type GroupEventKind = Doc<'groupEvents'>['kind'];

export type GroupEventTextInput = Readonly<{
  kind: GroupEventKind;
  /** The member the event is about; null once their account is gone. */
  username: string | null;
  /** The viewer is this member, so the sentence says "You". */
  isYou: boolean;
  setNumber: number | null;
  exerciseName: string | null;
}>;

/** One Group event as the viewer reads it, in the Group view and the recap. */
export function groupEventText(event: GroupEventTextInput): string {
  const name = event.isYou ? 'You' : (event.username ?? 'A Group member');
  const exercise = event.exerciseName ?? 'Exercise';
  switch (event.kind) {
    case 'joined':
      return `${name} joined`;
    case 'left':
      return `${name} left`;
    case 'dropped':
      return `${name} dropped out`;
    case 'removed':
      return event.isYou ? 'You were removed' : `${name} was removed`;
    case 'hostChanged':
      return event.isYou
        ? 'You are now the Group host'
        : `${name} is now the Group host`;
    case 'ended':
      return 'The Group ended';
    case 'setCompleted':
      return event.setNumber === null
        ? `${name} finished a Set of ${exercise}`
        : `${name} finished Set ${event.setNumber} of ${exercise}`;
    case 'targetMet':
      return event.isYou
        ? `You met your targets on ${exercise}`
        : `${name} met their targets on ${exercise}`;
  }
}
