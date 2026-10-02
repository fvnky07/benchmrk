import {
  type GroupEventTextInput,
  groupEventText,
} from '@/lib/groups/event-text';

const event = (
  overrides: Partial<GroupEventTextInput>
): GroupEventTextInput => ({
  kind: 'joined',
  username: 'sam',
  isYou: false,
  setNumber: null,
  exerciseName: null,
  ...overrides,
});

describe('Group event wording', () => {
  test('names the member, or says "You" for the viewer', () => {
    expect(groupEventText(event({ kind: 'joined' }))).toBe('sam joined');
    expect(groupEventText(event({ kind: 'joined', isYou: true }))).toBe(
      'You joined'
    );
    expect(groupEventText(event({ kind: 'dropped', isYou: true }))).toBe(
      'You dropped out'
    );
  });

  test('falls back to a generic member when the Benchmrk identity is deleted', () => {
    expect(groupEventText(event({ kind: 'left', username: null }))).toBe(
      'A Group member left'
    );
  });

  test('agrees the verb with "You"', () => {
    expect(groupEventText(event({ kind: 'removed' }))).toBe('sam was removed');
    expect(groupEventText(event({ kind: 'removed', isYou: true }))).toBe(
      'You were removed'
    );
    expect(groupEventText(event({ kind: 'hostChanged', isYou: true }))).toBe(
      'You are now the Group host'
    );
    expect(
      groupEventText(
        event({ kind: 'targetMet', isYou: true, exerciseName: 'Squat' })
      )
    ).toBe('You met your targets on Squat');
    expect(
      groupEventText(event({ kind: 'targetMet', exerciseName: 'Squat' }))
    ).toBe('sam met their targets on Squat');
  });

  test('a finished Set names its number only when known', () => {
    expect(
      groupEventText(
        event({
          kind: 'setCompleted',
          setNumber: 3,
          exerciseName: 'Bench Press',
        })
      )
    ).toBe('sam finished Set 3 of Bench Press');
    expect(
      groupEventText(event({ kind: 'setCompleted', exerciseName: null }))
    ).toBe('sam finished a Set of Exercise');
  });

  test('the Group ending is about no one', () => {
    expect(groupEventText(event({ kind: 'ended', isYou: true }))).toBe(
      'The Group ended'
    );
  });
});
