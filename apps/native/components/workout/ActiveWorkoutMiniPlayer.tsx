import { Portal } from '@rn-primitives/portal';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useActiveSessionStore,
  useWorkoutTimer,
  workoutSessionsApi,
} from '@/lib';

const TAB_BAR_HEIGHT = Platform.select({ android: 80, default: 49 });

export function ActiveWorkoutMiniPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeSessionId = useActiveSessionStore(
    (state) => state.activeSessionId
  );
  const sessionStartTimestamp = useActiveSessionStore(
    (state) => state.sessionStartTimestamp
  );
  const sessionName = useActiveSessionStore((state) => state.sessionName);
  const workoutTemplateId = useActiveSessionStore(
    (state) => state.workoutTemplateId
  );
  const endSession = useActiveSessionStore((state) => state.endSession);
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
            } finally {
              endSession();
            }
          },
        },
      ]
    );
  };

  if (!workoutTemplateId) return null;

  return (
    <Portal name="workout-mini-player">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resume ${sessionName}`}
        onPress={() =>
          router.push(`/(main)/workout/${workoutTemplateId}/start`)
        }
        style={[
          styles.container,
          { bottom: TAB_BAR_HEIGHT + insets.bottom + 8 },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.details}>
            <View style={styles.indicator} />
            <Text numberOfLines={1} style={styles.name}>
              {sessionName}
            </Text>
          </View>
          <Text style={styles.duration}>{formatted}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard active workout"
            hitSlop={12}
            onPress={(event) => {
              event.stopPropagation();
              handleCancel();
            }}
          >
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>
      </Pressable>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    left: 16,
    position: 'absolute',
    right: 16,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#202124',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  close: {
    color: '#a7aaad',
    fontSize: 24,
    lineHeight: 24,
  },
  details: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  duration: {
    color: '#b8f397',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    marginHorizontal: 12,
  },
  indicator: {
    backgroundColor: '#b8f397',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  name: {
    color: '#f5f5f5',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
