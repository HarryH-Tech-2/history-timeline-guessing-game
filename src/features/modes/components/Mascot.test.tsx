import { render } from '@testing-library/react-native';
import { cancelAnimation } from 'react-native-reanimated';

import { Mascot } from './Mascot';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>(
    'react-native-reanimated',
  );
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

const cancelled = cancelAnimation as jest.MockedFunction<typeof cancelAnimation>;

beforeEach(() => {
  cancelled.mockClear();
});

describe('Mascot', () => {
  it('cancels its animations when it unmounts so the idle bob cannot run forever', () => {
    // The bob is an endless withRepeat on the UI thread. Nothing stops a
    // running animation when its component goes away, so every summary
    // screen would leave one more loop ticking until the app restarts.
    const { unmount } = render(<Mascot line="Well played" />);
    expect(cancelled).not.toHaveBeenCalled();

    unmount();
    // pop, bubble and bob — all three shared values.
    expect(cancelled).toHaveBeenCalledTimes(3);
  });
});
