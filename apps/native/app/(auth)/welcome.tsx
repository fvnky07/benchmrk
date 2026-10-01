import { Button } from '@expo/ui';
import { router } from 'expo-router';

import { AuthShell } from '@/components/native/auth-shell';
import { SocialProviderGroup } from '@/components/native/social-provider-group';

export default function WelcomeScreen() {
  return (
    <AuthShell
      title="Welcome"
      supportingText="Track training, build consistency, and review your progress."
    >
      <SocialProviderGroup dividerPosition="after" />
      <Button label="Create account" onPress={() => router.push('/register')} />
      <Button
        label="Log in"
        variant="outlined"
        onPress={() => router.push('/login')}
      />
    </AuthShell>
  );
}
