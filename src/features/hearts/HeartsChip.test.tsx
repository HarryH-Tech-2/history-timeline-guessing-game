import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// eslint-disable-next-line import/first
import { HeartsChipView } from './HeartsChip';

describe('HeartsChipView', () => {
  it('shows the hearts left once misses cost hearts', () => {
    render(<HeartsChipView count={7} max={10} unlimited={false} atStake />);
    expect(screen.getByTestId('hud-hearts')).toHaveTextContent('7', { exact: false });
    expect(screen.getByLabelText('7 of 10 hearts left')).toBeOnTheScreen();
  });

  it('shows infinity for Premium players', () => {
    render(<HeartsChipView count={10} max={10} unlimited atStake />);
    expect(screen.getByTestId('hud-hearts')).toHaveTextContent('∞', { exact: false });
    expect(screen.getByLabelText('Unlimited hearts')).toBeOnTheScreen();
  });

  it('stays hidden during a new player’s free games', () => {
    render(<HeartsChipView count={10} max={10} unlimited={false} atStake={false} />);
    expect(screen.queryByTestId('hud-hearts')).toBeNull();
  });

  it('keeps showing when the count drops', () => {
    const view = render(<HeartsChipView count={5} max={10} unlimited={false} atStake />);
    view.rerender(<HeartsChipView count={4} max={10} unlimited={false} atStake />);
    expect(screen.getByTestId('hud-hearts')).toHaveTextContent('4', { exact: false });
  });
});
