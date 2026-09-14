import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import RNShare from 'react-native-share';

import { RunSummary } from './RunSummary';

const shareData = {
  heading: 'Survival · 1 round',
  subheading: '5 Sep 2026',
  totalScore: 900,
  rounds: [{ questionId: 'evt-moon-landing', errorYears: 4, score: 900, guessYear: 1973 }],
};

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

  it('renders no share button or card unless the run can be shared', () => {
    render(
      <RunSummary title="Run over" totalScore={0} primaryLabel="Home" onPrimary={jest.fn()} />,
    );
    expect(screen.queryByTestId('summary-share')).toBeNull();
    expect(screen.queryByTestId('share-card')).toBeNull();
  });

  it('shares the off-screen image card with the store link', async () => {
    jest.mocked(RNShare.open).mockClear();
    render(
      <RunSummary
        title="Out of lives"
        totalScore={900}
        primaryLabel="Play again"
        onPrimary={jest.fn()}
        share={{ data: shareData, mode: 'survival' }}
      />,
    );
    expect(screen.getByTestId('share-card')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('summary-share'));
    await waitFor(() => expect(RNShare.open).toHaveBeenCalledTimes(1));
    const options = jest.mocked(RNShare.open).mock.calls[0]![0] as { url: string; message: string };
    expect(options.url).toBe('file:///tmp/capture.png');
    expect(options.message).toContain('play.google.com');
  });

  it('puts Share first when a mode asks for it, keeping the other action as a ghost', () => {
    render(
      <RunSummary
        title="Daily complete"
        totalScore={900}
        primaryLabel="Home"
        onPrimary={jest.fn()}
        share={{ data: shareData, mode: 'daily', primary: true }}
      />,
    );
    const card = screen.getByTestId('summary-card');
    const labels = within(card)
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel as string);
    expect(labels.indexOf('Share result')).toBeLessThan(labels.indexOf('Home'));
  });
});
