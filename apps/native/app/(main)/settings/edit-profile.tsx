import { router } from 'expo-router';

import { ProfileForm } from '@/components/account/profile-form';
import { NativeScreen } from '@/components/native/native-screen';

export default function EditProfileScreen() {
  return (
    <NativeScreen>
      <ProfileForm mode="edit" onSaved={() => router.back()} />
    </NativeScreen>
  );
}
