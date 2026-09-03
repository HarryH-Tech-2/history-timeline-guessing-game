import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { QuestionSchema, type Question } from '@/domain';
import { SoundContext } from '@/features/sound';
import { evaluateGuess, isRightAnswer } from '@/features/timeline/math';

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

describe('RoundView answer feedback', () => {
  it('plays the sting that matches the shared right/wrong threshold on submit', () => {
    const play = jest.fn();
    const onSubmit = jest.fn();
    render(
      <SoundContext.Provider
        value={{ enabled: true, setEnabled: jest.fn(), toggle: jest.fn(), play }}
      >
        <RoundView
          question={question}
          phase="guessing"
          result={null}
          onSubmit={onSubmit}
          onNext={jest.fn()}
        />
      </SoundContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('submit-button'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const guessYear = onSubmit.mock.calls[0]![0] as number;
    const expected = isRightAnswer(Math.round(guessYear) - question.year) ? 'right' : 'wrong';
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith(expected);
  });
});

describe('RoundView framing between questions', () => {
  const ancient: Question = QuestionSchema.parse({
    ...question,
    id: 'q-ancient',
    title: 'The Birth of Marcus Aurelius',
    year: 121,
  });
  const next: Question = QuestionSchema.parse({ ...question, id: 'q-next', year: -490 });

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const readout = () => screen.getByLabelText('Selected year').props.value as string;

  it('zooms a big-miss reveal back in around the answer for the next question', () => {
    const { rerender } = render(
      <RoundView
        question={ancient}
        phase="guessing"
        result={null}
        onSubmit={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    // Lay the track out so the transform is live; the default framing is
    // 1700–2026, so the crosshair starts in the 1800s.
    act(() => {
      fireEvent(screen.getByTestId('timeline-pan-layer'), 'layout', {
        nativeEvent: { layout: { width: 390, height: 160 } },
      });
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(readout()).toBe('1863');

    // A 1,742-year miss: the reveal zooms out to fit guess and answer.
    fireEvent.press(screen.getByTestId('submit-button'));
    rerender(
      <RoundView
        question={ancient}
        phase="revealed"
        result={evaluateGuess(ancient, 1863)}
        onSubmit={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    rerender(
      <RoundView
        question={next}
        phase="guessing"
        result={null}
        onSubmit={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // The next question starts at the default zoom, centred on the last answer.
    expect(readout()).toBe('121');
  });
});
