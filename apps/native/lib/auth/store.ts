import { create } from 'zustand';

import type { SocialProvider, SocialResult } from './social';

/** Every way to sign in or register from the auth screens. */
export type AuthPath = 'password' | 'link' | 'register' | SocialProvider;

interface AuthStore {
  email: string;
  setEmail: (email: string) => void;
  clearEmail: () => void;
  /** The one auth request in flight, if any. */
  pendingPath: AuthPath | null;
  /** Takes the lock shared by the form and the provider buttons; false when held. */
  beginPending: (path: AuthPath) => boolean;
  endPending: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  email: '',
  setEmail: (email) => set({ email }),
  clearEmail: () => set({ email: '' }),
  pendingPath: null,
  beginPending: (path) => {
    if (get().pendingPath !== null) return false;
    set({ pendingPath: path });
    return true;
  },
  endPending: () => set({ pendingPath: null }),
}));

/** Success keeps the shared lock until the auth route's navigation cleanup. */
export async function runPendingSocialAuth(
  provider: SocialProvider,
  authenticate: () => Promise<SocialResult>
): Promise<SocialResult | null> {
  const { beginPending, endPending } = useAuthStore.getState();
  if (!beginPending(provider)) return null;
  let pendingNavigation = false;
  try {
    const result = await authenticate();
    pendingNavigation = result.status === 'success';
    return result;
  } finally {
    if (!pendingNavigation) endPending();
  }
}
