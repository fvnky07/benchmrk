import * as Application from 'expo-application';
import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

// NOTE: Initialise PostHog Cloud instance.
// Env vars are injected at build time via Expo's EXPO_PUBLIC_ prefix.
export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  {
    host:
      process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    captureAppLifecycleEvents: true,
    enableSessionReplay: false,
  }
);

/** Identify user after login / session restore */
export const identifyUser = (
  userId: string,
  traits?: Record<string, string | number | boolean>
) => {
  posthog.identify(userId, traits);
};

/** Reset identity on logout */
export const resetAnalytics = () => {
  posthog.reset();
};

// -------------------------------------------------------
// Typed event helpers
// -------------------------------------------------------

const ctx = () => ({
  app_version: Application.nativeApplicationVersion ?? 'unknown',
  app_build: Application.nativeBuildVersion ?? 'unknown',
  platform: Constants.platform?.ios ? 'ios' : 'android',
});

export const analytics = {
  // --- Appearance ---
  themeChanged: (theme: 'light' | 'dark' | 'system') => {
    posthog.capture('theme_changed', { theme, ...ctx() });
  },

  // --- Workout settings ---
  restTimerChanged: (seconds: number) => {
    posthog.capture('rest_timer_changed', { seconds, ...ctx() });
  },
  weightUnitChanged: (unit: 'kg' | 'lbs') => {
    posthog.capture('weight_unit_changed', { unit, ...ctx() });
  },
  autoSaveToggled: (enabled: boolean) => {
    posthog.capture('auto_save_toggled', { enabled, ...ctx() });
  },
  syncToggled: (enabled: boolean) => {
    posthog.capture('sync_toggled', { enabled, ...ctx() });
  },

  // --- Integrations ---
  integrationToggled: (integration: string, enabled: boolean) => {
    posthog.capture('integration_toggled', {
      integration,
      enabled,
      ...ctx(),
    });
  },

  // --- Navigation ---
  settingsScreenViewed: (screenName: string) => {
    posthog.capture('settings_screen_viewed', {
      screen_name: screenName,
      ...ctx(),
    });
  },

  // --- Account ---
  accountDeleted: () => {
    posthog.capture('account_deleted', ctx());
  },
  profileEdited: () => {
    posthog.capture('profile_edited', ctx());
  },

  // --- Preferences ---
  preferencesReset: () => {
    posthog.capture('preferences_reset', ctx());
  },
};
