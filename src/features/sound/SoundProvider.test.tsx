import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { ReactNode } from 'react';

import { SoundProvider, useSound } from './SoundProvider';

const mockedCreate = jest.mocked(createAudioPlayer);

function playersCreated() {
  return mockedCreate.mock.results.map((r) => r.value as { play: jest.Mock; seekTo: jest.Mock });
}

function wrapper({ children }: { children: ReactNode }) {
  return <SoundProvider>{children}</SoundProvider>;
}

describe('SoundProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedCreate.mockClear();
  });

  it('configures audio to play regardless of the Android ringer mode', async () => {
    renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(setAudioModeAsync).toHaveBeenCalled());
    // Android expo-audio no-ops play() on vibrate/silent unless this is true.
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: true }),
    );
  });

  it('is on by default and plays the matching sting from the start', async () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));
    expect(result.current.enabled).toBe(true);

    act(() => result.current.play('right'));
    const [right, wrong] = playersCreated();
    expect(right!.seekTo).toHaveBeenCalledWith(0);
    expect(right!.play).toHaveBeenCalledTimes(1);
    expect(wrong!.play).not.toHaveBeenCalled();

    act(() => result.current.play('wrong'));
    expect(wrong!.play).toHaveBeenCalledTimes(1);
  });

  it('stays silent while switched off and persists the choice', async () => {
    const { result, unmount } = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));

    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    act(() => result.current.play('right'));
    const [right] = playersCreated();
    expect(right!.play).not.toHaveBeenCalled();
    unmount();

    // A fresh provider rehydrates the saved "off".
    const second = renderHook(() => useSound(), { wrapper });
    await waitFor(() => expect(second.result.current.enabled).toBe(false));
  });
});
