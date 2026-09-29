import { fireEvent, render, screen } from '@testing-library/react-native';

import { haptic } from '@/features/haptics';
import { dateKey } from '@/utils/date';

import { StreakSheet } from './StreakSheet';

jest.mock('@/features/haptics', () => ({
  haptic: { notification: jest.fn(), impact: jest.fn(), selection: jest.fn() },
  NotificationFeedbackType: { Success: 'success' },
}));

const today = dateKey();
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
})();

const noop = () => undefined;

describe('StreakSheet', () => {
  beforeEach(() => jest.mocked(haptic.notification).mockClear());

  it('celebrates a streak that is safe for today', () => {
    render(
      <StreakSheet
        visible
        streak={{ count: 5, lastDate: today, freezes: 0 }}
        onPlay={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText('5-day streak!')).toBeOnTheScreen();
    expect(screen.getByText(/your streak is safe/i)).toBeOnTheScreen();
    expect(screen.queryByTestId('streak-play')).toBeNull();
    expect(haptic.notification).toHaveBeenCalledTimes(1);
  });

  it('asks the player to play today to extend the streak', () => {
    const onPlay = jest.fn();
    render(
      <StreakSheet
        visible
        streak={{ count: 5, lastDate: yesterday, freezes: 0 }}
        onPlay={onPlay}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/make it 6/i)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('streak-play'));
    expect(onPlay).toHaveBeenCalled();
  });

  it('invites a player with no streak to start one', () => {
    render(
      <StreakSheet
        visible
        streak={{ count: 0, lastDate: null, freezes: 0 }}
        onPlay={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText('Start a streak today')).toBeOnTheScreen();
    expect(screen.getByTestId('streak-play')).toBeOnTheScreen();
  });

  it('lights one dot per streak day this week', () => {
    render(
      <StreakSheet
        visible
        streak={{ count: 3, lastDate: today, freezes: 0 }}
        onPlay={noop}
        onClose={noop}
      />,
    );
    expect(screen.getAllByTestId('streak-day-lit')).toHaveLength(3);
  });

  it('mentions streak freezes the player owns', () => {
    render(
      <StreakSheet
        visible
        streak={{ count: 2, lastDate: today, freezes: 2 }}
        onPlay={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/2 streak freezes ready/)).toBeOnTheScreen();
  });

  it('closes from its button', () => {
    const onClose = jest.fn();
    render(
      <StreakSheet
        visible
        streak={{ count: 2, lastDate: today, freezes: 0 }}
        onPlay={noop}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByTestId('streak-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
