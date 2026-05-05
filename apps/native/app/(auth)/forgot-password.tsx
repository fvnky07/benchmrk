import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { forgotPasswordSchema } from '@/lib/schemas/auth';
import { showToast } from '@/lib/ui';

export default function ForgotPasswordScreen() {
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: forgotPasswordSchema,
    mode: 'onChange',
  });

  const onSubmit = () => {
    handleSubmit({ email }, async (_data) => {
      try {
        // TODO: Implement password reset with Better Auth
        analytics.passwordResetRequested();
        showToast.success('Check your email!', 'Password reset link sent');
        router.push('/login');
      } catch (error) {
        showToast.error(
          'Failed to send reset email',
          error instanceof Error ? error.message : 'Please try again'
        );
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['top']}>
      <KeyboardAwareScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
      >
        <View className="flex w-full items-start justify-center gap-1">
          <View className="mb-6 flex w-full flex-row items-center justify-center gap-2">
            <Text className="text-3xl">Tell us your email!</Text>
          </View>
          <Input
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (hasSubmitted) clearError('email');
            }}
            placeholder="Email"
            keyboardType="email-address"
            className="h-12"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={{ backgroundColor: '#202020' }}
            aria-invalid={!!errors.email}
          />
        </View>
        <View className="flex-1" />
        <View className="mb-6 flex w-full items-center justify-center">
          <Button className="w-full" onPress={onSubmit}>
            <Text>Send recovery email</Text>
            <Feather name="mail" size={24} color="black" />
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
