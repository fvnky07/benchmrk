import {
  displayDraft,
  draftsToPatch,
  draftToStored,
  steppedValue,
  storedToDraft,
  typeKey,
} from '@/lib/workout/set-entry';

const LB_STEP_KG = 5 * 0.45359237;

describe('weight entry', () => {
  test.each([
    ['135', 'lb'],
    ['62.5', 'kg'],
    ['102.5', 'lb'],
  ] as const)(
    '%s %s is stored in kg and reads back as entered',
    (draft, unit) => {
      const kg = draftToStored('weight', draft, unit);

      expect(storedToDraft('weight', kg, unit)).toBe(draft);
    }
  );

  test('+ and − move weight by the step in the member’s unit, never below 0', () => {
    const kg = draftToStored('weight', '135', 'lb');

    expect(
      storedToDraft('weight', steppedValue('weight', kg, 1, LB_STEP_KG), 'lb')
    ).toBe('140');
    expect(steppedValue('weight', 1, -1, 2.5)).toBe(0);
    expect(steppedValue('reps', 8, 1, 2.5)).toBe(9);
  });
});

describe('keypad', () => {
  test('reps take whole numbers only', () => {
    expect(typeKey('8', '.', 'reps')).toBe('8');
  });

  test('a weight takes one decimal point', () => {
    expect(typeKey(typeKey('', '.', 'weight'), '.', 'weight')).toBe('0.');
    expect(typeKey('62', '.', 'weight')).toBe('62.');
  });

  test('backspace removes the last character', () => {
    expect(typeKey('62.5', 'back', 'weight')).toBe('62.');
  });
});

describe('duration entry', () => {
  test('clock digits are minutes and seconds', () => {
    expect(draftToStored('duration', '130', 'kg')).toBe(90);
    expect(displayDraft('duration', '130')).toBe('1:30');
    expect(storedToDraft('duration', 3_725, 'kg')).toBe('10205');
    expect(displayDraft('duration', '10205')).toBe('1:02:05');
  });
});

describe('draft patches', () => {
  test('setting then clearing a draft sends an explicit clear on completion', () => {
    const fields = ['weight', 'reps'] as const;
    expect(draftsToPatch(fields, { weight: '60' }, 'kg')).toEqual({
      weightKg: 60,
    });
    expect(draftsToPatch(fields, { weight: '' }, 'kg')).toEqual({
      weightKg: null,
    });
    expect(draftsToPatch(fields, {}, 'kg')).toEqual({});
  });

  test('clears apply in stored units without clearing invalid or untouched fields', () => {
    expect(
      draftsToPatch(
        ['weight', 'reps', 'duration', 'distance'],
        { weight: '135', reps: 'invalid', duration: '', distance: '2.5' },
        'lb'
      )
    ).toEqual({
      weightKg: 135 * 0.45359237,
      durationSeconds: null,
      distanceMeters: 2500,
    });
  });
});
