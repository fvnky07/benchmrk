import { Button } from '@expo/ui';
import { router } from 'expo-router';

import { AuthShell, useAuthColumnWidth } from '@/components/native/auth-shell';
import { PrimaryButton } from '@/components/native/primary-button';
import { SocialProviderGroup } from '@/components/native/social-provider-group';

export default function WelcomeScreen() {
  const columnWidth = useAuthColumnWidth();

  return (
    <AuthShell
      title="Welcome"
      supportingText="Track training, build consistency, and review your progress."
    >
      <SocialProviderGroup dividerPosition="after" />
      <PrimaryButton
        label="Sign up"
        width={columnWidth}
        onPress={() => router.push('/register')}
      />
      <Button
        label="Log in"
        variant="outlined"
        onPress={() => router.push('/login')}
      />
    </AuthShell>
  );
}
