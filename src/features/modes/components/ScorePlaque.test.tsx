import { render, screen } from '@testing-library/react-native';

import { ScorePlaque } from './ScorePlaque';

describe('ScorePlaque', () => {
  it('shows the running score under a small label', () => {
    render(<ScorePlaque score={1234} />);
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1,234');
    expect(screen.getByText('Score')).toBeOnTheScreen();
    expect(screen.getByLabelText('Score 1234')).toBeOnTheScreen();
  });

  it('has no gain badge before the first points land', () => {
    render(<ScorePlaque score={0} />);
    expect(screen.queryByTestId('hud-score-gain')).toBeNull();
  });

  it('floats the points just won when the score goes up', () => {
    const view = render(<ScorePlaque score={400} />);
    view.rerender(<ScorePlaque score={1250} />);
    expect(screen.getByTestId('hud-score-gain')).toHaveTextContent('+850');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1,250');
  });

  it('does not float a badge when the score resets for a new run', () => {
    const view = render(<ScorePlaque score={2000} />);
    view.rerender(<ScorePlaque score={0} />);
    expect(screen.queryByTestId('hud-score-gain')).toBeNull();
  });
});
