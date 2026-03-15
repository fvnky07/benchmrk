import { Portal } from '@rn-primitives/portal';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import {
  useActiveSessionStore,
  useWorkoutTimer,
  workoutSessionsApi,
} from '@/lib';

const TAB_BAR_HEIGHT = 49;

export function ActiveWorkoutMiniPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeSessionId = useActiveSessionStore((s) => s.activeSessionId);
  const sessionStartTimestamp = useActiveSessionStore(
    (s) => s.sessionStartTimestamp
  );
  const sessionName = useActiveSessionStore((s) => s.sessionName);
  const endSession = useActiveSessionStore((s) => s.endSession);

  const { formatted } = useWorkoutTimer(sessionStartTimestamp);
  const abandonSession = useMutation(workoutSessionsApi.abandonSession);

  if (!activeSessionId) return null;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout?',
      'This will discard all progress. This cannot be undone.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              await abandonSession({ sessionId: activeSessionId });
            } catch {
              // Session may already be gone — still clear local state
            }
            endSession();
          },
        },
      ]
    );
  };

  const handleTap = () => {
    router.push('/(main)/workout');
  };

  return (
    <Portal name="workout-mini-player">
      <Pressable
        onPress={handleTap}
        style={{
          position: 'absolute',
          bottom: TAB_BAR_HEIGHT + insets.bottom + 8,
          left: 16,
          right: 16,
        }}
      >
        <View className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-black-2 px-4 py-3 shadow-lg">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-2 w-2 rounded-full bg-green-1" />
            <Text
              className="font-semibold text-sm text-white"
              numberOfLines={1}
            >
              {sessionName}
            </Text>
          </View>

          <Text className="mx-3 font-mono text-green-1 text-sm">
            {formatted}
          </Text>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text className="text-base text-white/50">✕</Text>
          </Pressable>
        </View>
      </Pressable>
    </Portal>
  );
}
