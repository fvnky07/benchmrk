import { runPendingSocialAuth, useAuthStore } from '@/lib/auth/store';

beforeEach(() => useAuthStore.getState().endPending());
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

test('successful social sign-in keeps every auth path locked until navigation leaves', async () => {
  await runPendingSocialAuth('google', async () => ({ status: 'success' }));

  expect(useAuthStore.getState().beginPending('password')).toBe(false);
  expect(useAuthStore.getState().beginPending('register')).toBe(false);
  expect(useAuthStore.getState().beginPending('apple')).toBe(false);
  useAuthStore.getState().endPending();
  expect(useAuthStore.getState().beginPending('password')).toBe(true);
});

test.each(['cancelled', 'failure'] as const)(
  '%s social sign-in releases the shared lock for retry',
  async (status) => {
    await runPendingSocialAuth('google', async () =>
      status === 'cancelled'
        ? { status }
        : { status, message: 'Could not confirm' }
    );
    expect(useAuthStore.getState().beginPending('password')).toBe(true);
  }
);

test('an unexpected social sign-in error releases the shared lock', async () => {
  await expect(
    runPendingSocialAuth('google', async () => {
      throw new Error('Provider unavailable');
    })
  ).rejects.toThrow('Provider unavailable');
  expect(useAuthStore.getState().beginPending('password')).toBe(true);
});

test('a pending provider blocks concurrent form and provider authentication', async () => {
  let resolve: (() => void) | undefined;
  const provider = runPendingSocialAuth('google', async () => {
    await new Promise<void>((complete) => {
      resolve = complete;
    });
    return { status: 'success' };
  });
  expect(useAuthStore.getState().beginPending('password')).toBe(false);
  const authenticate = jest.fn(async () => ({ status: 'success' as const }));
  expect(await runPendingSocialAuth('apple', authenticate)).toBeNull();
  expect(authenticate).not.toHaveBeenCalled();
  resolve?.();
  await provider;
  expect(useAuthStore.getState().beginPending('register')).toBe(false);
});
