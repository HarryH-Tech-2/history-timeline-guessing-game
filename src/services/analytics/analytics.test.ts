import PostHog from 'posthog-react-native';

import * as analytics from './client';

const MockedPostHog = jest.mocked(PostHog);

/** The single mock client instance every `new PostHog()` returns. */
function mockClient() {
  return new PostHog('any') as unknown as {
    capture: jest.Mock;
    identify: jest.Mock;
    optIn: jest.Mock;
    optOut: jest.Mock;
  };
}

function configure(key: string | undefined) {
  if (key === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
  else process.env.EXPO_PUBLIC_POSTHOG_KEY = key;
  analytics.resetAnalyticsForTests();
}

describe('analytics client', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    const c = mockClient();
    c.capture.mockClear();
    c.identify.mockClear();
    c.optIn.mockClear();
    c.optOut.mockClear();
    MockedPostHog.mockClear();
  });

  afterEach(() => {
    configure(originalKey);
  });

  it('is a silent no-op in builds without a PostHog key', () => {
    configure(undefined);
    expect(analytics.isAnalyticsConfigured()).toBe(false);
    expect(() => analytics.track('paywall_viewed')).not.toThrow();
    expect(() => analytics.track('hint_used', { question_id: 'q1' })).not.toThrow();
    analytics.identifyPlayer('uid-1');
    expect(analytics.getAnalyticsClient()).toBeNull();
    expect(MockedPostHog).not.toHaveBeenCalled();
    expect(mockClient().capture).not.toHaveBeenCalled();
  });

  it('creates one client with the key and forwards events with their properties', () => {
    configure('phc_test');
    expect(analytics.isAnalyticsConfigured()).toBe(true);

    analytics.track('mode_started', { mode: 'daily' });
    analytics.track('paywall_viewed');
    analytics.identifyPlayer('uid-1');
    analytics.identifyPlayer(null);

    expect(MockedPostHog).toHaveBeenCalledTimes(1);
    expect(MockedPostHog).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ captureAppLifecycleEvents: true }),
    );
    const client = mockClient();
    expect(client.capture).toHaveBeenCalledWith('mode_started', { mode: 'daily' });
    expect(client.capture).toHaveBeenCalledWith('paywall_viewed', undefined);
    expect(client.identify).toHaveBeenCalledTimes(1);
    expect(client.identify).toHaveBeenCalledWith('uid-1');
  });

  it('opts the client out and back in with the setting', async () => {
    configure('phc_test');
    await analytics.setAnalyticsEnabled(false);
    await analytics.setAnalyticsEnabled(true);
    expect(mockClient().optOut).toHaveBeenCalledTimes(1);
    expect(mockClient().optIn).toHaveBeenCalledTimes(1);
  });

  it('never lets a reporting failure escape', () => {
    configure('phc_test');
    mockClient().capture.mockImplementationOnce(() => {
      throw new Error('network down');
    });
    expect(() => analytics.track('hearts_exhausted')).not.toThrow();
  });
});
