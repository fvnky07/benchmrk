import { useAuthStore } from '@/lib/auth/store';

afterEach(() => useAuthStore.getState().endPending());

describe('the pending lock shared by every auth path', () => {
  it('lets one request in and refuses every other path until it ends', () => {
    const { beginPending, endPending } = useAuthStore.getState();

    expect(beginPending('password')).toBe(true);
    for (const path of ['link', 'register', 'apple', 'google'] as const) {
      expect(beginPending(path)).toBe(false);
    }
    expect(useAuthStore.getState().pendingPath).toBe('password');

    endPending();

    expect(beginPending('google')).toBe(true);
    expect(useAuthStore.getState().pendingPath).toBe('google');
  });
});
