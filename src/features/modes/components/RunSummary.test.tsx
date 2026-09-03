import { render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RunSummary } from './RunSummary';

describe('RunSummary', () => {
  it('renders an optional notice inside the summary card', () => {
    render(
      <RunSummary
        title="Stage cleared"
        totalScore={1200}
        primaryLabel="Back to map"
        onPrimary={jest.fn()}
        notice={<Text testID="notice">Keep your progress</Text>}
      />,
    );
    const card = screen.getByTestId('summary-card');
    expect(within(card).getByTestId('notice')).toBeOnTheScreen();
    expect(within(card).getByTestId('summary-primary')).toBeOnTheScreen();
  });

  it('renders no notice slot when none is given', () => {
    render(
      <RunSummary title="Run over" totalScore={0} primaryLabel="Home" onPrimary={jest.fn()} />,
    );
    expect(screen.queryByTestId('summary-notice')).toBeNull();
  });
});
