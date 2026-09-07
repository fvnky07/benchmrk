import * as Application from 'expo-application';
import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;
export const posthog =
  process.env.EXPO_PUBLIC_ENABLE_POSTHOG !== 'false' && posthogApiKey
    ? new PostHog(posthogApiKey, {
        host: posthogHost ?? 'https://us.i.posthog.com',
        captureAppLifecycleEvents: true,
        enableSessionReplay: false,
      })
    : undefined;

/** Identify user after login / session restore */
export const identifyUser = (
  userId: string,
  traits?: Record<string, string | number | boolean>
) => {
  posthog?.identify(userId, traits);
};

/** Reset identity on logout */
export const resetAnalytics = () => {
  posthog?.reset();
};

// -------------------------------------------------------
// Typed event helpers
// -------------------------------------------------------

function capture(
  event: string,
  properties?: Record<string, string | number | boolean>
) {
  posthog?.capture(event, properties);
}

const ctx = () => ({
  app_version: Application.nativeApplicationVersion ?? 'unknown',
  app_build: Application.nativeBuildVersion ?? 'unknown',
  platform: Constants.platform?.ios ? 'ios' : 'android',
});

export const analytics = {
  // --- Appearance ---
  themeChanged: (theme: 'light' | 'dark' | 'system') => {
    capture('theme_changed', { theme, ...ctx() });
  },

  // --- Workout settings ---
  restTimerChanged: (seconds: number) => {
    capture('rest_timer_changed', { seconds, ...ctx() });
  },
  weightUnitChanged: (unit: 'kg' | 'lbs') => {
    capture('weight_unit_changed', { unit, ...ctx() });
  },
  autoSaveToggled: (enabled: boolean) => {
    capture('auto_save_toggled', { enabled, ...ctx() });
  },
  syncToggled: (enabled: boolean) => {
    capture('sync_toggled', { enabled, ...ctx() });
  },

  // --- Integrations ---
  integrationToggled: (integration: string, enabled: boolean) => {
    capture('integration_toggled', {
      integration,
      enabled,
      ...ctx(),
    });
  },

  // --- Navigation ---
  settingsScreenViewed: (screenName: string) => {
    capture('settings_screen_viewed', {
      screen_name: screenName,
      ...ctx(),
    });
  },

  // --- Account ---
  accountDeleted: () => {
    capture('account_deleted', ctx());
  },
  profileEdited: () => {
    capture('profile_edited', ctx());
  },

  // --- Preferences ---
  preferencesReset: () => {
    capture('preferences_reset', ctx());
  },

  // --- Auth ---
  loginSuccess: () => {
    capture('login_success', ctx());
  },
  loginFailed: (error: string) => {
    capture('login_failed', { error, ...ctx() });
  },
  signupSuccess: () => {
    capture('signup_success', ctx());
  },
  signupFailed: (error: string) => {
    capture('signup_failed', { error, ...ctx() });
  },
  passwordResetRequested: () => {
    capture('password_reset_requested', ctx());
  },
  logout: () => {
    capture('logout', ctx());
  },

  // --- Onboarding ---
  profileCompleted: (hasPhoto: boolean, hasBio: boolean) => {
    capture('profile_completed', {
      has_photo: hasPhoto,
      has_bio: hasBio,
      ...ctx(),
    });
  },
  profileSkipped: () => {
    capture('profile_skipped', ctx());
  },
  profilePhotoUploaded: () => {
    capture('profile_photo_uploaded', ctx());
  },

  // --- Two-Factor Authentication ---
  twoFactorVerified: () => {
    capture('two_factor_verified', ctx());
  },
  twoFactorFailed: (error: string) => {
    capture('two_factor_failed', { error, ...ctx() });
  },
  twoFactorResent: () => {
    capture('two_factor_resent', ctx());
  },
};
