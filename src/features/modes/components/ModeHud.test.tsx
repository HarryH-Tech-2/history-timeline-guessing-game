import { render, screen } from '@testing-library/react-native';

import { QuestionSchema, type Question } from '@/domain';
import { evaluateGuess } from '@/features/timeline/math';

import { ModeHud, segmentTier } from './ModeHud';

const question: Question = QuestionSchema.parse({
  id: 'q1',
  categoryId: 'events',
  title: 'Moon Landing',
  subtitle: 'Apollo 11',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'Florida',
  latitude: 28.5,
  longitude: -80.6,
  shortDescription: 'a',
  longDescription: 'b',
  tags: [],
  verified: true,
  featured: false,
});

describe('ModeHud progress segments', () => {
  it('grades answered rounds and marks the live question', () => {
    const results = [
      evaluateGuess(question, 1969), // exact
      evaluateGuess(question, 1980), // 11 off → within the right-answer window
      evaluateGuess(question, 1900), // 69 off → miss
    ];
    render(
      <ModeHud progressLabel="Question 4 of 6" progress={{ current: 4, total: 6, results }} />,
    );

    expect(screen.getByLabelText('Question 4 of 6')).toBeOnTheScreen();
    expect(screen.getAllByTestId('hud-segment-perfect')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-segment-hit')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-segment-miss')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-segment-current')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-segment-upcoming')).toHaveLength(2);
  });

  it('still draws a plain bar when no results are supplied', () => {
    render(<ModeHud progress={{ current: 1, total: 3 }} />);
    expect(screen.getAllByTestId('hud-segment-current')).toHaveLength(1);
    expect(screen.getAllByTestId('hud-segment-upcoming')).toHaveLength(2);
  });

  it('tiers a result by exactness then the shared right-answer threshold', () => {
    expect(segmentTier(evaluateGuess(question, 1969))).toBe('perfect');
    expect(segmentTier(evaluateGuess(question, 1989))).toBe('hit');
    expect(segmentTier(evaluateGuess(question, 1990))).toBe('miss');
  });
});
