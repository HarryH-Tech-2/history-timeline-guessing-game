import { render, screen, within } from '@testing-library/react-native';

import { getQuestionById, getQuestions } from '@/data';

import { MAX_SHARE_ROWS, ShareCard } from './ShareCard';
import type { ShareCardData } from './shareData';

describe('ShareCard', () => {
  const [first, second] = getQuestions();
  const data: ShareCardData = {
    heading: 'Daily #3',
    subheading: '3 Sep 2026',
    totalScore: 1234,
    rounds: [
      { questionId: first!.id, errorYears: 0, score: 1000, guessYear: first!.year },
      { questionId: second!.id, errorYears: 130, score: 0, guessYear: second!.year + 130 },
      // Saved by a build before guesses were recorded.
      { questionId: first!.id, errorYears: 7, score: 700 },
    ],
  };

  it('lists every round with its event, the guess and the real year', () => {
    render(<ShareCard data={data} />);

    const row0 = within(screen.getByTestId('share-card-row-0'));
    expect(row0.getByText(first!.title)).toBeTruthy();
    expect(row0.getAllByText(String(first!.year))).toHaveLength(2); // guess and answer agree

    const row1 = within(screen.getByTestId('share-card-row-1'));
    expect(row1.getByText(second!.title)).toBeTruthy();
    expect(row1.getByText(String(second!.year + 130))).toBeTruthy();
    expect(row1.getByText(String(getQuestionById(second!.id)!.year))).toBeTruthy();

    // A round without a recorded guess still shows the answer.
    const row2 = within(screen.getByTestId('share-card-row-2'));
    expect(row2.getByText('—')).toBeTruthy();
    expect(row2.getByText(String(first!.year))).toBeTruthy();

    expect(screen.getByText('Daily #3')).toBeTruthy();
    expect(screen.getByText('3 Sep 2026')).toBeTruthy();
    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('1/3 exact')).toBeTruthy();
    expect(screen.queryByTestId('share-card-more')).toBeNull();
  });

  it('caps a long run at the rows that fit and tallies the rest', () => {
    const rounds = Array.from({ length: MAX_SHARE_ROWS + 5 }, () => ({
      questionId: first!.id,
      errorYears: 3,
      score: 900,
      guessYear: first!.year + 3,
    }));
    render(
      <ShareCard data={{ heading: 'Survival · 13 rounds', subheading: 'Today', totalScore: 11700, rounds }} />,
    );

    expect(screen.getByTestId(`share-card-row-${MAX_SHARE_ROWS - 1}`)).toBeTruthy();
    expect(screen.queryByTestId(`share-card-row-${MAX_SHARE_ROWS}`)).toBeNull();
    expect(screen.getByTestId('share-card-more')).toHaveTextContent('+ 5 more rounds');
  });
});
