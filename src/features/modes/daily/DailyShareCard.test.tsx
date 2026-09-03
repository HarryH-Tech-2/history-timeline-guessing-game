import { render, screen, within } from '@testing-library/react-native';

import { getQuestionById, getQuestions } from '@/data';

import type { DailyRecord } from '../persistence';
import { DailyShareCard } from './DailyShareCard';

describe('DailyShareCard', () => {
  const [first, second] = getQuestions();
  const record: DailyRecord = {
    date: '2026-09-03',
    totalScore: 1234,
    perfectCount: 1,
    rounds: [
      { questionId: first!.id, errorYears: 0, score: 1000, guessYear: first!.year },
      { questionId: second!.id, errorYears: 130, score: 0, guessYear: second!.year + 130 },
      // Saved by a build before guesses were recorded.
      { questionId: first!.id, errorYears: 7, score: 700 },
    ],
  };

  it('lists every round with its event, the guess and the real year', () => {
    render(<DailyShareCard record={record} />);

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
    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('1/3 exact')).toBeTruthy();
  });
});
