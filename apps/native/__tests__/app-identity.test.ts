import appConfig from '../app.json';

describe('native application identities', () => {
  it('uses the approved Android ID without changing the iOS identity', () => {
    expect(appConfig.expo.android.package).toBe('com.benchmrk.app');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.benchmrk.native');
  });
});
