import { create } from 'zustand';

import type { SocialProvider } from './social';

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
