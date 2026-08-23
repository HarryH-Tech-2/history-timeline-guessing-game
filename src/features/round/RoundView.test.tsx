import { render, screen } from '@testing-library/react-native';

import { QuestionSchema, type Question } from '@/domain';
import { evaluateGuess } from '@/features/timeline/math';

import { RoundView } from './RoundView';

const question: Question = QuestionSchema.parse({
  id: 'q1',
  categoryId: 'events',
  title: 'US Declaration of Independence',
  subtitle: 'The thirteen colonies declare independence',
  year: 1776,
  difficulty: 'easy',
  country: 'United States',
  region: 'Philadelphia',
  latitude: 39.9,
  longitude: -75.1,
  shortDescription: 'Independence declared.',
  longDescription: 'The Continental Congress adopted the Declaration of Independence.',
  tags: ['politics'],
  verified: true,
  featured: true,
});

describe('RoundView reveal state', () => {
  it('shows the guess on the timeline and explains the distance in terms of it', () => {
    const result = evaluateGuess(question, 1838);
    render(
      <RoundView
        question={question}
        phase="revealed"
        result={result}
        onSubmit={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    // Both the correct year and the player's guess are marked on the track…
    expect(screen.getByTestId('reveal-marker-answer')).toBeOnTheScreen();
    expect(screen.getByTestId('reveal-marker-guess')).toBeOnTheScreen();
    // …and the live crosshair (which would now read the re-framed centre year,
    // not the guess) is gone, so there is only one "your year" on screen.
    expect(screen.queryByLabelText('Selected year')).toBeNull();
    // The distance line names the guess so the number can be checked at a glance.
    expect(screen.getByText('You guessed 1838 — 62 years away')).toBeOnTheScreen();
  });

  it('keeps the crosshair while guessing', () => {
    render(
      <RoundView
        question={question}
        phase="guessing"
        result={null}
        onSubmit={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Selected year')).toBeOnTheScreen();
    expect(screen.queryByTestId('reveal-marker-guess')).toBeNull();
  });
});
