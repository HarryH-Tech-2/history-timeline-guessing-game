import { act, render, screen } from '@testing-library/react-native';

import { CROSSFADE_MS, EraBackdrop } from './EraBackdrop';

describe('EraBackdrop', () => {
  afterEach(() => jest.useRealTimers());

  it('cross-fades in 200 ms and then drops the outgoing painting', () => {
    jest.useFakeTimers();
    expect(CROSSFADE_MS).toBe(200);
    const { rerender } = render(<EraBackdrop eraId="ancient" />);
    rerender(<EraBackdrop eraId="medieval" />);
    expect(screen.getByTestId('era-backdrop-ancient')).toBeOnTheScreen();
    expect(screen.getByTestId('era-backdrop-medieval')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(260));
    expect(screen.queryByTestId('era-backdrop-ancient')).toBeNull();
  });

  it('settles on the last era after a fast fling through several', () => {
    jest.useFakeTimers();
    const { rerender } = render(<EraBackdrop eraId="ancient" />);
    for (const era of ['medieval', 'early-modern', 'nineteenth', 'modern']) {
      rerender(<EraBackdrop eraId={era} />);
      act(() => jest.advanceTimersByTime(40));
    }
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByTestId('era-backdrop-modern')).toBeOnTheScreen();
    for (const gone of ['ancient', 'medieval', 'early-modern', 'nineteenth']) {
      expect(screen.queryByTestId(`era-backdrop-${gone}`)).toBeNull();
    }
  });
});
