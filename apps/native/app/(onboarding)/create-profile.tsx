import { Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';

import { ProfileForm } from '@/components/account/profile-form';
import { NativeScreen } from '@/components/native/native-screen';

/** Profile setup saves the username before its final notification choice. */
export default function CreateProfileScreen() {
  const profile = useQuery(api.profile.getCurrentProfile);
  if (profile?.username) {
    return <Redirect href="/(onboarding)/push-permission" />;
  }
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 30, fontWeight: '700' }}>
        Complete your profile
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        Choose a username. A photo and bio are optional.
      </Text>
      <ProfileForm mode="setup" />
    </NativeScreen>
  );
}
