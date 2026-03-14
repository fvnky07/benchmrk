import { internalMutation } from './_generated/server';

/** Seed exercise catalog with 15 fundamental exercises covering major movement patterns */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const exercises = [
      {
        slug: 'push-up',
        name: 'Push-up',
        description:
          'Bodyweight pressing movement targeting chest, shoulders, and triceps',
        category: 'Push',
        muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
        instructions:
          'Start in plank position with hands shoulder-width apart. Lower your body until chest nearly touches floor, then push back up to starting position.',
      },
      {
        slug: 'pull-up',
        name: 'Pull-up',
        description: 'Bodyweight pulling movement targeting back and biceps',
        category: 'Pull',
        muscleGroups: ['Back', 'Biceps'],
        instructions:
          'Hang from a bar with hands shoulder-width apart. Pull yourself up until chin is above the bar, then lower back down with control.',
      },
      {
        slug: 'squat',
        name: 'Squat',
        description:
          'Fundamental lower body movement targeting quads, glutes, and hamstrings',
        category: 'Legs',
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
        instructions:
          'Stand with feet shoulder-width apart. Lower your body by bending knees and hips, keeping chest up. Drive through heels to return to standing.',
      },
      {
        slug: 'deadlift',
        name: 'Deadlift',
        description: 'Full-body pulling movement emphasizing posterior chain',
        category: 'Legs',
        muscleGroups: ['Hamstrings', 'Back', 'Glutes'],
        instructions:
          'Stand with feet hip-width apart, bar over mid-foot. Grip bar and drive through heels, extending hips and knees simultaneously.',
      },
      {
        slug: 'bench-press',
        name: 'Bench Press',
        description:
          'Horizontal pressing movement targeting chest, shoulders, and triceps',
        category: 'Push',
        muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
        instructions:
          'Lie on bench with feet flat on floor. Lower bar to chest level, then press upward until arms are extended.',
      },
      {
        slug: 'overhead-press',
        name: 'Overhead Press',
        description:
          'Vertical pressing movement targeting shoulders and triceps',
        category: 'Push',
        muscleGroups: ['Shoulders', 'Triceps'],
        instructions:
          'Stand with feet shoulder-width apart, bar at shoulder height. Press bar overhead until arms are fully extended.',
      },
      {
        slug: 'bent-over-row',
        name: 'Bent-over Row',
        description: 'Horizontal pulling movement targeting back and biceps',
        category: 'Pull',
        muscleGroups: ['Back', 'Biceps'],
        instructions:
          'Bend forward at hips with slight knee bend. Pull bar to chest, squeezing shoulder blades together, then lower with control.',
      },
      {
        slug: 'plank',
        name: 'Plank',
        description:
          'Isometric core exercise targeting abdominals and stabilizers',
        category: 'Core',
        muscleGroups: ['Core', 'Abs'],
        instructions:
          'Start in forearm plank position with elbows under shoulders. Keep body in straight line from head to heels, engaging core throughout.',
      },
      {
        slug: 'lunge',
        name: 'Lunge',
        description:
          'Single-leg movement targeting quads, glutes, and hamstrings',
        category: 'Legs',
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
        instructions:
          'Step forward with one leg, lowering hips until both knees are bent at 90 degrees. Push back to starting position.',
      },
      {
        slug: 'dip',
        name: 'Dip',
        description:
          'Bodyweight pressing movement targeting chest, triceps, and shoulders',
        category: 'Push',
        muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
        instructions:
          'Support yourself on parallel bars with arms extended. Lower body by bending elbows, then press back up to starting position.',
      },
      {
        slug: 'chin-up',
        name: 'Chin-up',
        description:
          'Pulling movement with underhand grip targeting back and biceps',
        category: 'Pull',
        muscleGroups: ['Back', 'Biceps'],
        instructions:
          'Hang from bar with hands shoulder-width apart, palms facing you. Pull yourself up until chin is above bar, then lower with control.',
      },
      {
        slug: 'romanian-deadlift',
        name: 'Romanian Deadlift',
        description: 'Hip-hinge movement emphasizing hamstrings and glutes',
        category: 'Legs',
        muscleGroups: ['Hamstrings', 'Glutes'],
        instructions:
          'Stand with feet hip-width apart, slight knee bend. Hinge at hips, pushing hips back while keeping bar close to body.',
      },
      {
        slug: 'lat-pulldown',
        name: 'Lat Pulldown',
        description:
          'Machine-based pulling movement targeting latissimus dorsi',
        category: 'Pull',
        muscleGroups: ['Back', 'Biceps'],
        instructions:
          'Sit at machine with feet flat. Pull bar down to chest level, squeezing lats, then return to starting position with control.',
      },
      {
        slug: 'leg-press',
        name: 'Leg Press',
        description:
          'Machine-based lower body movement targeting quads and glutes',
        category: 'Legs',
        muscleGroups: ['Quadriceps', 'Glutes'],
        instructions:
          'Sit in machine with feet on platform shoulder-width apart. Lower platform by bending knees, then press back to starting position.',
      },
      {
        slug: 'cable-row',
        name: 'Cable Row',
        description: 'Machine-based pulling movement targeting back and biceps',
        category: 'Pull',
        muscleGroups: ['Back', 'Biceps'],
        instructions:
          'Sit at cable machine with feet flat. Pull handle to torso, squeezing shoulder blades, then return with control.',
      },
    ];

    let seededCount = 0;

    for (const exercise of exercises) {
      // Check if exercise already exists by slug (idempotency)
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_slug', (q) => q.eq('slug', exercise.slug))
        .first();

      if (!existing) {
        await ctx.db.insert('exercises', exercise);
        seededCount += 1;
      }
    }

    return {
      message: `Seeded ${seededCount} new exercises (${exercises.length} total in catalog)`,
      seededCount,
      totalExercises: exercises.length,
    };
  },
});
