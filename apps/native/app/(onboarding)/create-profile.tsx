import { Text } from '@expo/ui';

import { ProfileForm } from '@/components/account/profile-form';
import { NativeScreen } from '@/components/native/native-screen';

/**
 * Profile setup: the checkpoint every new Benchmrk identity passes. Saving a
 * username lets the onboarding gate route into the app.
 */
export default function CreateProfileScreen() {
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
