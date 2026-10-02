import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';

import { PROGRESSION_SAVE_KEY } from '@/features/progression/persistence';
import { scopedKey } from '@/storage';

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

/** A game save from before this build: the device of an existing player. */
async function seedExistingSave() {
  await AsyncStorage.setItem(scopedKey(PROGRESSION_SAVE_KEY, 'uid-1'), '{}');
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

  it('is off on a new install', async () => {
    const { result } = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(false));
    haptic.selection();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('stays on for a player who already has a save on the device', async () => {
    await seedExistingSave();
    const { result } = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(true));
    haptic.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps a new install off once a save appears later', async () => {
    const first = renderHook(() => useHaptics(), { wrapper });
    await waitFor(() => expect(first.result.current.enabled).toBe(false));
    first.unmount();
    await seedExistingSave();
    const second = renderHook(() => useHaptics(), { wrapper });
    // Give the read a chance to (wrongly) flip it on.
    await act(async () => {});
    expect(second.result.current.enabled).toBe(false);
  });

  it('switches the gate off, persists the choice and rehydrates it', async () => {
    await seedExistingSave();
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
