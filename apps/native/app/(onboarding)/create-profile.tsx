import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';

import { ProfileForm } from '@/components/account/profile-form';
import { NativeScreen } from '@/components/native/native-screen';
import { ScreenTitle } from '@/components/native/screen-title';

/** Profile setup saves the username before its final notification choice. */
export default function CreateProfileScreen() {
  const profile = useQuery(api.profile.getCurrentProfile);
  if (profile?.username) {
    return <Redirect href="/(onboarding)/push-permission" />;
  }
  return (
    <NativeScreen edges={['top', 'bottom']}>
      <ScreenTitle
        title="Complete your profile"
        subtitle="Choose a username. A photo and bio are optional."
      />
      <ProfileForm mode="setup" />
    </NativeScreen>
  );
}
