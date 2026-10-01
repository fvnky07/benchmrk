import { LinearWavyProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';

/** Planned Sets completed, as Material 3 Expressive's wavy linear indicator. */
export function WorkoutProgress({ fraction }: Readonly<{ fraction: number }>) {
  return (
    <LinearWavyProgressIndicator
      progress={fraction}
      modifiers={[fillMaxWidth()]}
    />
  );
}
