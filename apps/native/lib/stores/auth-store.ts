import { create } from 'zustand';

interface AuthStore {
  email: string;
  setEmail: (email: string) => void;
  clearEmail: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  email: '',
  setEmail: (email) => set({ email }),
  clearEmail: () => set({ email: '' }),
}));
