import type app from './app.json';

type AppConfig = typeof app.expo & {
  extra?: Record<string, unknown>;
};

export default ({ config }: { config: AppConfig }) => {
  const iosScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? []), 'expo-apple-authentication'];
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
