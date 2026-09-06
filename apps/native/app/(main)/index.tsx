import { ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';

import { NativeListScreen } from '@/components/native/native-list-screen';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function HomeScreen() {
  const { username } = useUserProfile();
  const workouts = useQuery(api.workouts.getRecentWorkoutsWithProfiles, {
    limit: 20,
  });

  return (
    <NativeListScreen>
      <ListItem supportingText="Recent training from the Benchmrk community.">
        {`Welcome back, ${username}`}
      </ListItem>
      {workouts === undefined ? (
        <ListItem supportingText="Loading recent workouts…">
          Community feed
        </ListItem>
      ) : workouts.length === 0 ? (
        <ListItem supportingText="No completed workouts have been shared yet.">
          Community feed
        </ListItem>
      ) : (
        workouts.map((workout) => (
          <ListItem
            key={workout._id}
            supportingText={`${workout.exerciseCount} exercises · ${workout.totalSets} sets · ${workout.totalVolume} kg`}
          >
            {`${workout.user.name}: ${workout.name}`}
          </ListItem>
        ))
      )}
      <Text textStyle={{ fontSize: 14 }}>
        Community totals and follower counts are unavailable until live
        aggregates are implemented.
      </Text>
    </NativeListScreen>
  );
}
