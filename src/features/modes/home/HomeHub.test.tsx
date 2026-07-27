import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { HomeHub } from './HomeHub';

describe('HomeHub', () => {
  it('offers all four modes', () => {
    render(<HomeHub />);
    expect(screen.getByTestId('mode-daily')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-endless')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-survival')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-campaign')).toBeOnTheScreen();
  });
});
