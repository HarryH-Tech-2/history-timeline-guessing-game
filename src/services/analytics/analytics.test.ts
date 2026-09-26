import * as firebase from '@react-native-firebase/analytics';
import PostHog from 'posthog-react-native';

import * as analytics from './client';
import { toFirebaseParams } from './firebaseAnalytics';

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

  it('mirrors every event, the uid and the switch to Firebase Analytics', async () => {
    configure('phc_test');
    jest.mocked(firebase.logEvent).mockClear();
    jest.mocked(firebase.setUserId).mockClear();
    jest.mocked(firebase.setAnalyticsCollectionEnabled).mockClear();

    analytics.track('run_completed', { mode: 'daily', rounds: 8, total_score: 900, exact: 2 });
    analytics.track('onboarding_completed', { choice: 'daily', named: false, reminders: true });
    analytics.track('paywall_viewed');
    analytics.identifyPlayer('uid-1');
    await analytics.setAnalyticsEnabled(false);

    const analyticsArg = expect.anything();
    expect(firebase.logEvent).toHaveBeenCalledWith(analyticsArg, 'run_completed', {
      mode: 'daily',
      rounds: 8,
      total_score: 900,
      exact: 2,
    });
    // Booleans travel as strings: Firebase parameters are strings or numbers only.
    expect(firebase.logEvent).toHaveBeenCalledWith(analyticsArg, 'onboarding_completed', {
      choice: 'daily',
      named: 'false',
      reminders: 'true',
    });
    expect(firebase.logEvent).toHaveBeenCalledWith(analyticsArg, 'paywall_viewed', undefined);
    expect(firebase.setUserId).toHaveBeenCalledWith(analyticsArg, 'uid-1');
    expect(firebase.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(analyticsArg, false);
  });

  it('still reports to Firebase in a build with no PostHog key', () => {
    configure(undefined);
    jest.mocked(firebase.logEvent).mockClear();
    analytics.track('mode_started', { mode: 'survival' });
    expect(firebase.logEvent).toHaveBeenCalledWith(expect.anything(), 'mode_started', {
      mode: 'survival',
    });
  });

  it('is a silent no-op when the Firebase native module is missing from the build', () => {
    configure('phc_test');
    jest.mocked(firebase.getAnalytics).mockImplementationOnce(() => {
      throw new Error('You attempted to use a Firebase module that is not installed natively');
    });
    jest.mocked(firebase.logEvent).mockClear();
    expect(() => analytics.track('hearts_exhausted')).not.toThrow();
    expect(() => analytics.track('paywall_viewed')).not.toThrow();
    expect(firebase.logEvent).not.toHaveBeenCalled();
    // PostHog is unaffected.
    expect(mockClient().capture).toHaveBeenCalledWith('paywall_viewed', undefined);
  });

  it('trims Firebase string parameters to the 100-character cap and drops the rest', () => {
    expect(toFirebaseParams({ s: 'x'.repeat(120), n: 3, b: true, o: { nested: 1 } })).toEqual({
      s: 'x'.repeat(100),
      n: 3,
      b: 'true',
    });
    expect(toFirebaseParams(undefined)).toBeUndefined();
  });

  it('never lets a reporting failure escape', () => {
    configure('phc_test');
    mockClient().capture.mockImplementationOnce(() => {
      throw new Error('network down');
    });
    expect(() => analytics.track('hearts_exhausted')).not.toThrow();
  });
});
