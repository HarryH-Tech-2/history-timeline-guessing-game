import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import PostHog from 'posthog-react-native';
import { Pressable, Text } from 'react-native';

import { AnalyticsProvider, useAnalyticsSettings } from './AnalyticsProvider';
import { resetAnalyticsForTests } from './client';

/** Auth as the provider sees it; tests reassign fields between renders. */
const mockAuth = { uid: null as string | null, hasAccount: false };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => mockAuth }));

function mockClient() {
  return new PostHog('any') as unknown as {
    optIn: jest.Mock;
    optOut: jest.Mock;
    identify: jest.Mock;
    reset: jest.Mock;
  };
}

function Probe() {
  const { enabled, toggle } = useAnalyticsSettings();
  return (
    <Pressable onPress={toggle} testID="toggle">
      <Text testID="state">{enabled ? 'on' : 'off'}</Text>
    </Pressable>
  );
}

function renderProbe() {
  return render(
    <AnalyticsProvider>
      <Probe />
    </AnalyticsProvider>,
  );
}

describe('AnalyticsProvider', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  beforeEach(async () => {
    await AsyncStorage.clear();
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    resetAnalyticsForTests();
    mockClient().optIn.mockClear();
    mockClient().optOut.mockClear();
    mockClient().identify.mockClear();
    mockClient().reset.mockClear();
    mockAuth.uid = null;
    mockAuth.hasAccount = false;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    else process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
    resetAnalyticsForTests();
  });

  it('defaults to on and opts the client in on launch', async () => {
    const screen = renderProbe();
    await waitFor(() => expect(mockClient().optIn).toHaveBeenCalledTimes(1));
    expect(mockClient().optOut).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).toHaveTextContent('on');
  });

  it('honours a saved opt-out on launch', async () => {
    await AsyncStorage.setItem('chronos.analytics', 'false');
    const screen = renderProbe();
    await waitFor(() => expect(mockClient().optOut).toHaveBeenCalledTimes(1));
    expect(mockClient().optIn).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).toHaveTextContent('off');
  });

  it('toggling off opts the client out and persists the choice', async () => {
    const screen = renderProbe();
    await waitFor(() => expect(mockClient().optIn).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.press(screen.getByTestId('toggle'));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('off');
    await waitFor(() => expect(mockClient().optOut).toHaveBeenCalledTimes(1));
    expect(await AsyncStorage.getItem('chronos.analytics')).toBe('false');
  });

  it('leaves a guest on the device id and identifies only a real account', async () => {
    mockAuth.uid = 'guest-1';
    mockAuth.hasAccount = false;
    const screen = renderProbe();
    await waitFor(() => expect(mockClient().optIn).toHaveBeenCalledTimes(1));
    expect(mockClient().identify).not.toHaveBeenCalled();

    // Google sign-in: same device, now an account.
    mockAuth.uid = 'account-1';
    mockAuth.hasAccount = true;
    screen.rerender(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    );
    expect(mockClient().identify).toHaveBeenCalledTimes(1);
    expect(mockClient().identify).toHaveBeenCalledWith('account-1');
    expect(mockClient().reset).not.toHaveBeenCalled();

    // Sign-out: back to a fresh guest uid — reset, never identify it.
    mockAuth.uid = 'guest-2';
    mockAuth.hasAccount = false;
    screen.rerender(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    );
    expect(mockClient().reset).toHaveBeenCalledTimes(1);
    expect(mockClient().identify).toHaveBeenCalledTimes(1);
  });

  it('does not reset for a guest who was never identified', async () => {
    mockAuth.uid = 'guest-1';
    const screen = renderProbe();
    await waitFor(() => expect(mockClient().optIn).toHaveBeenCalledTimes(1));
    mockAuth.uid = 'guest-2';
    screen.rerender(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    );
    expect(mockClient().reset).not.toHaveBeenCalled();
    expect(mockClient().identify).not.toHaveBeenCalled();
  });

  it('falls back to on outside a provider', () => {
    const screen = render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('on');
  });
});
