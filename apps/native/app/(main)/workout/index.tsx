import { UnavailableCapability } from '@/components/native/unavailable-capability';

export default function WorkoutScreen() {
  return (
    <UnavailableCapability
      title="Workouts"
      explanation="Routines and Workout logging are being rebuilt and can't be used in this build."
    />
  );
}
