import { ProgressView } from '@expo/ui/swift-ui';

/** Planned Sets completed, as SwiftUI's linear ProgressView. */
export function WorkoutProgress({ fraction }: Readonly<{ fraction: number }>) {
  return <ProgressView value={fraction} />;
}
