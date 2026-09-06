import { ListItem, Text } from '@expo/ui';

import { NativeScreen } from '@/components/native/native-screen';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function ProfileScreen() {
  const { bio, initials, username } = useUserProfile();

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>
        {username || initials}
      </Text>
      {bio ? <Text textStyle={{ fontSize: 17 }}>{bio}</Text> : null}
      <ListItem supportingText="Workout totals, follows, activity, and training history are not available yet.">
        Profile insights
      </ListItem>
      <ListItem supportingText="Your existing profile details remain available here while live profile statistics are being built.">
        More profile data coming soon
      </ListItem>
    </NativeScreen>
  );
}
