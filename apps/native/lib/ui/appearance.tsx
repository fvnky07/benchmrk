import type { Theme } from '@react-navigation/native';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  type AppearancePreference,
  persistOptimisticPreference,
  type ResolvedAppearance,
  resolveAppearance,
} from './appearance-state';
import { createNavigationTheme } from './navigation-theme';

type AppearanceContextValue = {
  preference: AppearancePreference;
  resolvedAppearance: ResolvedAppearance;
  navigationTheme: Theme;
  isLoadingPreference: boolean;
  isSavingPreference: boolean;
  setPreference: (preference: AppearancePreference) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  children,
  isAuthenticated,
}: Readonly<{
  children: ReactNode;
  isAuthenticated: boolean;
}>) {
  const systemAppearance = useColorScheme();
  const settings = useQuery(
    api.memberSettings.get,
    isAuthenticated ? {} : 'skip'
  );
  const updateSettings = useMutation(api.memberSettings.update);
  const [optimisticPreference, setOptimisticPreference] =
    useState<AppearancePreference | null>(null);
  const [isSavingPreference, setIsSavingPreference] = useState(false);

  const persistedPreference = settings?.appearance ?? 'system';
  const preference = isAuthenticated
    ? (optimisticPreference ?? persistedPreference)
    : 'system';
  const resolvedAppearance = resolveAppearance(preference, systemAppearance);

  useEffect(() => {
    if (!isAuthenticated) {
      setOptimisticPreference(null);
      setIsSavingPreference(false);
      return;
    }

    if (optimisticPreference === settings?.appearance) {
      setOptimisticPreference(null);
    }
  }, [isAuthenticated, optimisticPreference, settings?.appearance]);

  const setPreference = useCallback(
    async (next: AppearancePreference) => {
      if (!isAuthenticated || isSavingPreference) {
        return;
      }

      const previous = optimisticPreference ?? persistedPreference;
      setIsSavingPreference(true);

      try {
        await persistOptimisticPreference({
          next,
          previous,
          apply: setOptimisticPreference,
          persist: (appearance) => updateSettings({ appearance }),
        });
      } finally {
        setIsSavingPreference(false);
      }
    },
    [
      isAuthenticated,
      isSavingPreference,
      optimisticPreference,
      persistedPreference,
      updateSettings,
    ]
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      preference,
      resolvedAppearance,
      navigationTheme: createNavigationTheme(resolvedAppearance),
      isLoadingPreference: isAuthenticated && settings === undefined,
      isSavingPreference,
      setPreference,
    }),
    [
      isAuthenticated,
      isSavingPreference,
      preference,
      settings,
      resolvedAppearance,
      setPreference,
    ]
  );

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);

  if (!value) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }

  return value;
}
