import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => undefined,
}));
jest.mock('@/features/leaderboard/LeaderboardScreen', () => {
  const { Text } = require('react-native');
  return { LeaderboardScreen: () => <Text testID="global-board">global</Text> };
});

// eslint-disable-next-line import/first
import { SocialScreen } from './SocialScreen';

const flush = () => act(async () => {});

describe('SocialScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('opens on Global and switches segments', async () => {
    render(<SocialScreen />);
    await flush();
    expect(screen.getByTestId('global-board')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('segment-challenges'));
    expect(screen.getByTestId('challenges-panel')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('segment-groups'));
    expect(screen.getByTestId('groups-panel')).toBeOnTheScreen();
    await flush();
  });

  it('restores the last chosen segment', async () => {
    const first = render(<SocialScreen />);
    await flush();
    fireEvent.press(screen.getByTestId('segment-groups'));
    await flush();
    first.unmount();

    render(<SocialScreen />);
    await flush();
    expect(screen.getByTestId('groups-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('global-board')).toBeNull();
  });
});
