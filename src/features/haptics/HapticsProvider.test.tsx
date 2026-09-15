import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';

import { haptic, setHapticsEnabled } from './haptics';
import { HapticsProvider, useHaptics } from './HapticsProvider';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <HapticsProvider>{children}</HapticsProvider>;
}

describe('haptics gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  it('forwards every kind of buzz while on', () => {
    haptic.impact();
    haptic.selection();
    haptic.notification(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('is a silent no-op while off', () => {
    setHapticsEnabled(false);
    haptic.impact();
    haptic.selection();
    haptic.notification(Haptics.NotificationFeedbackType.Warning);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('HapticsProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  it('is on by default', async () => {
    const { result } = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(true));
    haptic.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('switches the gate off, persists the choice and rehydrates it', async () => {
    const { result, unmount } = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(true));

    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    haptic.selection();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    unmount();

    // A fresh provider (and a fresh process: gate reset to on) rehydrates "off".
    setHapticsEnabled(true);
    const second = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(second.result.current.enabled).toBe(false));
    haptic.impact();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
