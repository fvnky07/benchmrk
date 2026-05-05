import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';

/**
 * SplashScreen component shown while determining auth state
 *
 * NOTE: Simple implementation for now
 * TODO: Consider adding:
 * - Animated logo
 * - Brand colors
 * - Fade transitions
 */
export function SplashScreen() {
  return (
    <View style={styles.container} className="bg-background">
      <View style={styles.content}>
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-4 text-muted-foreground">Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
});
