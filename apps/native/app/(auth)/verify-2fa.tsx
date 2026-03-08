import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { PinInput } from '@/components/ui/pin-input';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth';
import { twoFactorSchema } from '@/lib/schemas/auth';
import { showToast } from '@/lib/ui';

const RESEND_COOLDOWN = 60;
const EMPTY_CODE = ['', '', '', '', '', ''];

export default function VerifyTwoFactorScreen() {
  const email = useAuthStore((state) => state.email);

  const [code, setCode] = useState<string[]>([...EMPTY_CODE]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setIsResendDisabled(true);
    setCountdown(RESEND_COOLDOWN);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start resend countdown on mount
  useEffect(() => {
    startCountdown();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCountdown]);

  const clearCode = useCallback(() => {
    setCode([...EMPTY_CODE]);
  }, []);

  const handleVerify = useCallback(
    async (fullCode: string) => {
      // Validate with Zod
      const result = twoFactorSchema.safeParse({ code: fullCode });

      if (!result.success) {
        setHasError(true);
        showToast.error('Invalid Code', result.error.issues[0].message);
        clearCode();
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        // TODO: Replace with actual Better Auth + Convex 2FA verification
        console.log('Verifying 2FA code:', fullCode);

        // Simulated API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // TODO: Remove this simulated error check
        if (fullCode === '000000') {
          throw new Error('Invalid or expired code');
        }

        analytics.twoFactorVerified();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast.success('Verified!', 'Code verified successfully');
        router.replace('/');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Invalid or expired code';
        analytics.twoFactorFailed(errorMessage);
        setHasError(true);
        clearCode();
        showToast.error('Verification Failed', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearCode]
  );

  const handleAutoSubmit = useCallback(
    (fullCode: string) => {
      const result = twoFactorSchema.safeParse({ code: fullCode });
      if (result.success) {
        handleVerify(fullCode);
      }
    },
    [handleVerify]
  );

  const handleManualSubmit = () => {
    const fullCode = code.join('');
    handleVerify(fullCode);
  };

  const handleResendCode = async () => {
    if (isResendDisabled) return;

    try {
      // TODO: Replace with actual resend code API call
      console.log('Resending 2FA code to:', email);

      analytics.twoFactorResent();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showToast.success('Code Sent', 'Check your email for a new code');
      startCountdown();
      clearCode();
      setHasError(false);
    } catch (error) {
      showToast.error(
        'Failed to resend',
        error instanceof Error ? error.message : 'Please try again'
      );
    }
  };

  const handleCodeChange = (newCode: string[]) => {
    // Clear error state when user starts typing again
    if (hasError) setHasError(false);
    setCode(newCode);
  };

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['top', 'bottom']}>
      <View className="flex-1 justify-between px-6">
        {/* Header */}
        <View className="items-center pt-8">
          <Text className="font-bold text-3xl">Enter Verification Code</Text>
          <Text className="mt-2 text-center text-muted-foreground">
            We sent a 6-digit code to{' '}
            {email ? (
              <Text className="font-medium text-white">{email}</Text>
            ) : (
              'your email'
            )}
          </Text>
        </View>

        {/* PIN Input */}
        <View className="items-center gap-6">
          <PinInput
            value={code}
            onChange={handleCodeChange}
            onComplete={handleAutoSubmit}
            error={hasError}
            disabled={isLoading}
          />

          {/* Resend Code */}
          <Pressable
            onPress={handleResendCode}
            disabled={isResendDisabled || isLoading}
          >
            <Text
              className={
                isResendDisabled || isLoading
                  ? 'text-muted-foreground'
                  : 'text-blue-400'
              }
            >
              {isResendDisabled
                ? `Resend code in ${countdown}s`
                : "Didn't receive a code? Resend"}
            </Text>
          </Pressable>
        </View>

        {/* Verify Button */}
        <View className="mb-6 w-full items-center">
          <Button
            className="w-full"
            onPress={handleManualSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <>
                <Text>Verify</Text>
                <Feather name="check" size={20} color="black" />
              </>
            )}
          </Button>
          <Pressable onPress={() => router.back()} disabled={isLoading}>
            <Text className="mt-4 text-blue-400">Go back</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
