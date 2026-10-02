import type { Equipment } from '../domain/units';

export type CatalogExercise = {
  slug: string;
  name: string;
  description: string;
  category: string;
  muscleGroups: string[];
  instructions: string;
  type: 'strength' | 'bodyweight' | 'timed' | 'cardio';
  equipment: Equipment;
};

/**
 * The shared Exercise catalog. It is seeded once into the database, which is the
 * source of truth afterwards; changes here must only ever add Exercises.
 */
export const EXERCISE_CATALOG: CatalogExercise[] = [
  {
    slug: 'push-up',
    name: 'Push-up',
    description:
      'Bodyweight pressing movement targeting chest, shoulders, and triceps',
    category: 'Push',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    instructions:
      'Start in plank position with hands shoulder-width apart. Lower your body until chest nearly touches floor, then push back up to starting position.',
    type: 'bodyweight',
    equipment: 'bodyweight',
  },
  {
    slug: 'pull-up',
    name: 'Pull-up',
    description: 'Bodyweight pulling movement targeting back and biceps',
    category: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    instructions:
      'Hang from a bar with hands shoulder-width apart. Pull yourself up until chin is above the bar, then lower back down with control.',
    type: 'bodyweight',
    equipment: 'bodyweight',
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
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'deadlift',
    name: 'Deadlift',
    description: 'Full-body pulling movement emphasizing posterior chain',
    category: 'Legs',
    muscleGroups: ['Hamstrings', 'Back', 'Glutes'],
    instructions:
      'Stand with feet hip-width apart, bar over mid-foot. Grip bar and drive through heels, extending hips and knees simultaneously.',
    type: 'strength',
    equipment: 'barbell',
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
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'overhead-press',
    name: 'Overhead Press',
    description: 'Vertical pressing movement targeting shoulders and triceps',
    category: 'Push',
    muscleGroups: ['Shoulders', 'Triceps'],
    instructions:
      'Stand with feet shoulder-width apart, bar at shoulder height. Press bar overhead until arms are fully extended.',
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'bent-over-row',
    name: 'Bent-over Row',
    description: 'Horizontal pulling movement targeting back and biceps',
    category: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    instructions:
      'Bend forward at hips with slight knee bend. Pull bar to chest, squeezing shoulder blades together, then lower with control.',
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'plank',
    name: 'Plank',
    description: 'Isometric core exercise targeting abdominals and stabilizers',
    category: 'Core',
    muscleGroups: ['Core', 'Abs'],
    instructions:
      'Start in forearm plank position with elbows under shoulders. Keep body in straight line from head to heels, engaging core throughout.',
    type: 'timed',
    equipment: 'bodyweight',
  },
  {
    slug: 'lunge',
    name: 'Lunge',
    description: 'Single-leg movement targeting quads, glutes, and hamstrings',
    category: 'Legs',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    instructions:
      'Step forward with one leg, lowering hips until both knees are bent at 90 degrees. Push back to starting position.',
    type: 'strength',
    equipment: 'dumbbell',
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
    type: 'bodyweight',
    equipment: 'bodyweight',
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
    type: 'bodyweight',
    equipment: 'bodyweight',
  },
  {
    slug: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    description: 'Hip-hinge movement emphasizing hamstrings and glutes',
    category: 'Legs',
    muscleGroups: ['Hamstrings', 'Glutes'],
    instructions:
      'Stand with feet hip-width apart, slight knee bend. Hinge at hips, pushing hips back while keeping bar close to body.',
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'lat-pulldown',
    name: 'Lat Pulldown',
    description: 'Cable pulling movement targeting latissimus dorsi',
    category: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    instructions:
      'Sit at machine with feet flat. Pull bar down to chest level, squeezing lats, then return to starting position with control.',
    type: 'strength',
    equipment: 'cable',
  },
  {
    slug: 'leg-press',
    name: 'Leg Press',
    description: 'Machine-based lower body movement targeting quads and glutes',
    category: 'Legs',
    muscleGroups: ['Quadriceps', 'Glutes'],
    instructions:
      'Sit in machine with feet on platform shoulder-width apart. Lower platform by bending knees, then press back to starting position.',
    type: 'strength',
    equipment: 'machine',
  },
  {
    slug: 'cable-row',
    name: 'Cable Row',
    description: 'Cable pulling movement targeting back and biceps',
    category: 'Pull',
    muscleGroups: ['Back', 'Biceps'],
    instructions:
      'Sit at cable machine with feet flat. Pull handle to torso, squeezing shoulder blades, then return with control.',
    type: 'strength',
    equipment: 'cable',
  },
  {
    slug: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    description: 'Horizontal dumbbell press targeting chest and triceps',
    category: 'Push',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    instructions:
      'Lie on a bench holding a dumbbell over each shoulder. Lower them to chest level, then press back up.',
    type: 'strength',
    equipment: 'dumbbell',
  },
  {
    slug: 'dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    description: 'Vertical dumbbell press targeting shoulders and triceps',
    category: 'Push',
    muscleGroups: ['Shoulders', 'Triceps'],
    instructions:
      'Sit or stand with dumbbells at shoulder height. Press overhead until arms are extended, then lower with control.',
    type: 'strength',
    equipment: 'dumbbell',
  },
  {
    slug: 'lateral-raise',
    name: 'Lateral Raise',
    description: 'Dumbbell raise targeting the side delts',
    category: 'Push',
    muscleGroups: ['Shoulders'],
    instructions:
      'Stand with a dumbbell in each hand. Raise them out to the sides to shoulder height, then lower with control.',
    type: 'strength',
    equipment: 'dumbbell',
  },
  {
    slug: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    description: 'Elbow flexion targeting the biceps',
    category: 'Pull',
    muscleGroups: ['Biceps'],
    instructions:
      'Stand with a dumbbell in each hand, palms forward. Curl them to your shoulders, then lower with control.',
    type: 'strength',
    equipment: 'dumbbell',
  },
  {
    slug: 'chest-press-machine',
    name: 'Chest Press Machine',
    description: 'Machine press targeting chest and triceps',
    category: 'Push',
    muscleGroups: ['Chest', 'Triceps'],
    instructions:
      'Set the seat so the handles are at mid-chest. Press the handles forward until your arms are extended, then return with control.',
    type: 'strength',
    equipment: 'machine',
  },
  {
    slug: 'leg-extension',
    name: 'Leg Extension',
    description: 'Machine knee extension targeting the quadriceps',
    category: 'Legs',
    muscleGroups: ['Quadriceps'],
    instructions:
      'Sit with the pad on your lower shins. Extend your knees until your legs are straight, then lower with control.',
    type: 'strength',
    equipment: 'machine',
  },
  {
    slug: 'leg-curl',
    name: 'Leg Curl',
    description: 'Machine knee flexion targeting the hamstrings',
    category: 'Legs',
    muscleGroups: ['Hamstrings'],
    instructions:
      'Position the pad above your heels. Curl your heels towards you, then return with control.',
    type: 'strength',
    equipment: 'machine',
  },
  {
    slug: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    description: 'Cable elbow extension targeting the triceps',
    category: 'Push',
    muscleGroups: ['Triceps'],
    instructions:
      'Stand facing a high pulley. Push the handle down until your arms are straight, keeping elbows at your sides.',
    type: 'strength',
    equipment: 'cable',
  },
  {
    slug: 'cable-fly',
    name: 'Cable Fly',
    description: 'Cable chest fly targeting the pecs',
    category: 'Push',
    muscleGroups: ['Chest'],
    instructions:
      'Stand between two pulleys. Bring the handles together in front of your chest in a wide arc, then return with control.',
    type: 'strength',
    equipment: 'cable',
  },
  {
    slug: 'hip-thrust',
    name: 'Hip Thrust',
    description: 'Hip extension targeting the glutes',
    category: 'Legs',
    muscleGroups: ['Glutes', 'Hamstrings'],
    instructions:
      'Sit with your upper back against a bench and a bar over your hips. Drive your hips up until your body is straight, then lower.',
    type: 'strength',
    equipment: 'barbell',
  },
  {
    slug: 'rowing-machine',
    name: 'Rowing Machine',
    description: 'Full-body cardio on an indoor rower',
    category: 'Cardio',
    muscleGroups: ['Back', 'Legs'],
    instructions:
      'Drive with your legs, then lean back and pull the handle to your ribs. Reverse the order to return.',
    type: 'cardio',
    equipment: 'machine',
  },
  {
    slug: 'running',
    name: 'Running',
    description: 'Running on a treadmill or outdoors',
    category: 'Cardio',
    muscleGroups: ['Legs'],
    instructions: 'Run at a steady pace for the planned duration or distance.',
    type: 'cardio',
    equipment: 'other',
  },
];
