import type app from './app.json';

type AppConfig = typeof app.expo & {
  extra?: Record<string, unknown>;
};

export default ({ config }: { config: AppConfig }) => {
  const iosScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const bundleIdentifier = config.ios?.bundleIdentifier ?? 'com.benchmrk.app';
  const plugins = [
    ...(config.plugins ?? []),
    'expo-apple-authentication',
    'expo-notifications',
    // The Workout's Live Activity (expo-widgets registers it at runtime).
    [
      'expo-widgets',
      {
        bundleIdentifier: `${bundleIdentifier}.widgets`,
        groupIdentifier: `group.${bundleIdentifier}`,
      },
    ] as never,
  ];
  if (iosScheme)
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: iosScheme },
    ] as never);
  return {
    ...config,
    plugins,
    extra: { ...config.extra, googleIosSignInConfigured: Boolean(iosScheme) },
    ios: { ...config.ios, usesAppleSignIn: true },
  };
};
