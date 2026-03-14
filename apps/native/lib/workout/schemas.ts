import { z } from 'zod';

export const workoutNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less');

export const exerciseConfigSchema = z.object({
  sets: z.number().int().min(1, 'Sets must be at least 1'),
  reps: z.number().int().min(1, 'Reps must be at least 1'),
  weight: z.number().min(0, 'Weight cannot be negative'),
});

export type ExerciseConfig = z.infer<typeof exerciseConfigSchema>;
