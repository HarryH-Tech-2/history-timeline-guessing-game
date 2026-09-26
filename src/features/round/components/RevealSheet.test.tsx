import { render, screen } from '@testing-library/react-native';

import { QuestionSchema, type Question } from '@/domain';
import { evaluateGuess } from '@/features/timeline/math';

import { RevealSheet } from './RevealSheet';

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
  longDescription: 'Neil Armstrong and Buzz Aldrin walk on the Moon.',
  tags: [],
  verified: true,
  featured: false,
});

describe('RevealSheet', () => {
  it('colours the verdict ribbon by outcome', () => {
    const { rerender } = render(
      <RevealSheet result={evaluateGuess(question, 1969)} categoryColour="#123456" onNext={jest.fn()} />,
    );
    expect(screen.getByTestId('reveal-verdict-perfect')).toBeOnTheScreen();
    expect(screen.getByText('Exact year')).toBeOnTheScreen();

    rerender(
      <RevealSheet result={evaluateGuess(question, 1980)} categoryColour="#123456" onNext={jest.fn()} />,
    );
    expect(screen.getByTestId('reveal-verdict-hit')).toBeOnTheScreen();
    expect(screen.getByText('Within 20 years')).toBeOnTheScreen();

    rerender(
      <RevealSheet result={evaluateGuess(question, 1900)} categoryColour="#123456" onNext={jest.fn()} />,
    );
    expect(screen.getByTestId('reveal-verdict-miss')).toBeOnTheScreen();
    expect(screen.getByText('You guessed 1900 — 69 years away')).toBeOnTheScreen();
  });

  it('shows the year as the hero and the description beneath', () => {
    render(
      <RevealSheet result={evaluateGuess(question, 1975)} categoryColour="#123456" onNext={jest.fn()} />,
    );
    expect(screen.getByText('1969')).toBeOnTheScreen();
    expect(screen.getByText(/walk on the Moon/)).toBeOnTheScreen();
    expect(screen.getByTestId('reveal-score-chip')).toBeOnTheScreen();
    expect(screen.getByTestId('next-button')).toBeOnTheScreen();
  });

  it('shows coins, museum and achievement pills only when earned', () => {
    const result = evaluateGuess(question, 1969);
    const { rerender } = render(
      <RevealSheet
        result={result}
        categoryColour="#123456"
        onNext={jest.fn()}
        reward={{ xp: 150, coins: 5 }}
        acquired
        unlockedTitles={['Bullseye']}
      />,
    );
    expect(screen.getByTestId('reveal-coins')).toBeOnTheScreen();
    expect(screen.getByTestId('museum-acquired')).toBeOnTheScreen();
    expect(screen.getByText('🏆 Bullseye')).toBeOnTheScreen();
    expect(screen.queryByText(/XP/)).toBeNull();

    rerender(
      <RevealSheet result={result} categoryColour="#123456" onNext={jest.fn()} reward={{ xp: 150, coins: 0 }} />,
    );
    expect(screen.queryByTestId('reveal-coins')).toBeNull();
    expect(screen.queryByTestId('museum-acquired')).toBeNull();
  });
});
