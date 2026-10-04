import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/native/brand-logo';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <BrandLogo size={96} />
        <ActivityIndicator size="large" style={styles.spinner} />
        <Text style={styles.label}>Loading…</Text>
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
  spinner: {
    marginTop: 24,
  },
  label: {
    marginTop: 16,
  },
});
