import { Button, Host } from '@expo/ui';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SocialProvider } from '@/lib/auth';
import { THEME, useAppearance } from '@/lib/ui';

type AuthShellProps = Readonly<{ children: ReactNode }>;

type AuthProviderGroupProps = Readonly<{
  configResolved: boolean;
  appleCapabilityResolved: boolean;
  appleAvailable: boolean;
  googleAvailable: boolean;
  busy: SocialProvider | null;
  onPress: (provider: SocialProvider) => void;
  status?: string | null;
}>;

export function AuthShell({ children }: AuthShellProps) {
  const { resolvedAppearance } = useAppearance();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(Math.max(width - 48, 0), 420);

  return (
    <Host colorScheme={resolvedAppearance} style={styles.safeArea}>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[
          styles.safeArea,
          { backgroundColor: THEME[resolvedAppearance].background },
        ]}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: contentWidth }]}>
            {children}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Host>
  );
}

export function AuthProviderGroup({
  configResolved,
  appleCapabilityResolved,
  appleAvailable,
  googleAvailable,
  busy,
  onPress,
  status,
}: AuthProviderGroupProps) {
  const { resolvedAppearance } = useAppearance();
  const hasProvider = appleAvailable || googleAvailable;
  const providersResolved = configResolved && appleCapabilityResolved;

  return (
    <View style={styles.providerGroup}>
      {!providersResolved ? (
        <AuthStatus message="Loading sign-in options…" />
      ) : hasProvider ? (
        <>
          {appleAvailable ? (
            <View style={{ opacity: busy && busy !== 'apple' ? 0.55 : 1 }}>
              <AppleAuthentication.AppleAuthenticationButton
                accessibilityLabel="Continue with Apple"
                accessibilityState={{ disabled: busy !== null }}
                buttonStyle={
                  resolvedAppearance === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                cornerRadius={10}
                onPress={() => {
                  if (!busy) onPress('apple');
                }}
                style={styles.appleButton}
              />
            </View>
          ) : null}
          {googleAvailable ? (
            <GoogleSigninButton
              accessibilityLabel="Continue with Google"
              color={
                resolvedAppearance === 'dark'
                  ? GoogleSigninButton.Color.Light
                  : GoogleSigninButton.Color.Dark
              }
              disabled={busy !== null}
              onPress={() => {
                if (!busy) onPress('google');
              }}
              size={GoogleSigninButton.Size.Wide}
              style={styles.googleButton}
            />
          ) : null}
        </>
      ) : status ? (
        <AuthStatus message={status} />
      ) : null}
      {busy ? <AuthStatus message={`Signing in with ${busy}…`} /> : null}
      {status && hasProvider ? <AuthStatus message={status} /> : null}
    </View>
  );
}

export function AuthDivider() {
  const { resolvedAppearance } = useAppearance();
  const dividerColor = THEME[resolvedAppearance].border;
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      <Text
        accessibilityLabel="or"
        style={[
          styles.dividerLabel,
          { color: THEME[resolvedAppearance].mutedForeground },
        ]}
      >
        or
      </Text>
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />
    </View>
  );
}

export function AuthRouteActions() {
  return (
    <View style={styles.actions}>
      <Button
        label="Create account"
        onPress={() => router.replace('/register')}
      />
      <Button
        label="Log in"
        onPress={() => router.replace('/login')}
        variant="outlined"
      />
    </View>
  );
}

export function AuthStatus({ message }: Readonly<{ message: string }>) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible
      style={styles.status}
    >
      <Text selectable>{message}</Text>
    </View>
  );
}

export function AuthLegalPlaceholder() {
  const { resolvedAppearance } = useAppearance();
  return (
    <View accessible={false} style={styles.legal}>
      <Text
        selectable
        style={{
          color: THEME[resolvedAppearance].mutedForeground,
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        Terms of Service and Privacy Policy coming soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: { gap: 16, maxWidth: 420, paddingVertical: 16 },
  providerGroup: { gap: 12, width: '100%' },
  appleButton: { height: 48, width: '100%' },
  googleButton: { height: 48, width: '100%' },
  status: { minHeight: 24, justifyContent: 'center', width: '100%' },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 14 },
  actions: { gap: 12, width: '100%' },
  legal: { paddingTop: 8, width: '100%' },
});
